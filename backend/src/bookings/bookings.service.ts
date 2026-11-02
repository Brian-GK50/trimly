import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const availableSlots = new Set([
  '09:00',
  '10:30',
  '12:00',
  '13:30',
  '15:00',
  '16:30',
]);

type BookingRecord = QueryResultRow & {
  id: string;
  reference: string;
  shop_name: string;
  service_name: string;
  staff_id: string;
  staff_name: string;
  starts_at: Date;
  total: number | string;
  deposit: number | string;
  status: string;
};

@Injectable()
export class BookingsService {
  constructor(private readonly database: DatabaseService) {}

  async getBookings(user: AuthenticatedUser) {
    const result = await this.database.query<BookingRecord>(
      `SELECT bookings.id, bookings.reference, shops.name AS shop_name,
              services.name AS service_name, bookings.staff_id, staff.name AS staff_name,
              bookings.starts_at, bookings.total, bookings.deposit, bookings.status
       FROM bookings
       JOIN shops ON shops.id = bookings.shop_id
       JOIN services ON services.id = bookings.service_id
       JOIN staff ON staff.id = bookings.staff_id
       WHERE bookings.user_id = $1
       ORDER BY bookings.starts_at DESC`,
      [user.id],
    );
    return { bookings: result.rows.map(serializeBooking) };
  }

  async createBooking(
    user: AuthenticatedUser,
    input: {
      shopId: string;
      serviceId: string;
      staffId: string;
      startsAt: string;
    },
  ) {
    const startsAt = new Date(input.startsAt);
    this.assertBookableSlot(startsAt);

    return this.database.withTransaction(async (client) => {
      const slotKey = `${input.staffId}:${startsAt.toISOString()}`;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [slotKey]);

      await client.query(
        `UPDATE bookings SET status = 'EXPIRED'
         WHERE staff_id = $1 AND starts_at = $2
           AND status = 'PENDING_PAYMENT' AND expires_at <= now()`,
        [input.staffId, startsAt],
      );

      const existing = await client.query(
        `SELECT 1 FROM bookings
         WHERE staff_id = $1 AND starts_at = $2
           AND status IN ('PENDING_PAYMENT', 'CONFIRMED')`,
        [input.staffId, startsAt],
      );
      if (existing.rowCount) {
        throw new ConflictException('Slot unavailable');
      }

      const appointment = await client.query<{
        price: number | string;
        shop_name: string;
        service_name: string;
        staff_name: string;
      }>(
        `SELECT services.price, shops.name AS shop_name,
                services.name AS service_name, staff.name AS staff_name
         FROM services
         JOIN shops ON shops.id = services.shop_id
         JOIN staff ON staff.shop_id = shops.id
         WHERE services.shop_id = $1 AND services.id = $2 AND staff.id = $3`,
        [input.shopId, input.serviceId, input.staffId],
      );
      const details = appointment.rows[0];
      if (!details) {
        throw new NotFoundException('Shop, service, or stylist not found');
      }

      const id = randomUUID();
      const reference = `TRM-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
      const total = Number(details.price);
      const deposit = Math.round(total * 0.25);

      await client.query(
        `INSERT INTO bookings
          (id, reference, user_id, shop_id, service_id, staff_id, starts_at,
           total, deposit, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_PAYMENT',
                 now() + interval '10 minutes')`,
        [
          id,
          reference,
          user.id,
          input.shopId,
          input.serviceId,
          input.staffId,
          startsAt,
          total,
          deposit,
        ],
      );

      return {
        booking: {
          id,
          reference,
          shopName: details.shop_name,
          serviceName: details.service_name,
          staffId: input.staffId,
          stylistName: details.staff_name,
          date: startsAt.toISOString(),
          time: startsAt.toISOString(),
          total,
          deposit,
          status: 'PENDING_PAYMENT',
        },
      };
    });
  }

  private assertBookableSlot(startsAt: Date): void {
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Choose a valid appointment time');
    }
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(startsAt)
        .map(({ type, value }) => [type, value]),
    );
    const localSlot = `${parts.hour}:${parts.minute}`;

    if (
      startsAt.getTime() < Date.now() + 60_000
      || parts.weekday === 'Sun'
      || !availableSlots.has(localSlot)
    ) {
      throw new BadRequestException(
        'Choose an available future appointment time',
      );
    }
  }
}

function serializeBooking(booking: BookingRecord) {
  const startsAt = new Date(booking.starts_at);
  return {
    id: booking.id,
    reference: booking.reference,
    shopName: booking.shop_name,
    serviceName: booking.service_name,
    staffId: booking.staff_id,
    stylistName: booking.staff_name,
    date: new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'long',
    }).format(startsAt),
    time: new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      minute: '2-digit',
    }).format(startsAt),
    total: Number(booking.total),
    deposit: Number(booking.deposit),
    status: booking.status,
  };
}
