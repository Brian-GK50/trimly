import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

export type ShopInput = {
  name: string;
  location: string;
  address: string;
  category: string;
  image: string;
};

export type ServiceInput = {
  name: string;
  description: string;
  duration: number;
  price: number;
};

export type StaffInput = {
  name: string;
  role: string;
};

@Injectable()
export class ShopService {
  constructor(private readonly database: DatabaseService) {}

  async getShops() {
    const result = await this.database.query(shopSelect + ' ORDER BY shops.name');
    return result.rows;
  }

  async getShop(id: string) {
    const result = await this.database.query(shopSelect + ' WHERE shops.id = $1', [
      id,
    ]);
    return result.rows[0] ?? null;
  }

  async getOwnedShops(ownerId: string) {
    const result = await this.database.query(
      shopSelect + ' WHERE shops.owner_user_id = $1 ORDER BY shops.created_at DESC',
      [ownerId],
    );
    return result.rows;
  }

  async createShop(shop: ShopInput, ownerId: string) {
    const slug = shop.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const id = `${slug || 'shop'}-${randomUUID().slice(0, 12)}`;

    await this.database.query(
      `INSERT INTO shops
        (id, owner_user_id, name, location, address, rating, reviews, category, open_label, image)
       VALUES ($1, $2, $3, $4, $5, 0, 0, $6, 'Open Now', $7)`,
      [
        id,
        ownerId,
        shop.name,
        shop.location,
        shop.address,
        shop.category,
        shop.image,
      ],
    );

    return this.getShop(id);
  }

  async updateShop(
    ownerId: string,
    shopId: string,
    input: Partial<ShopInput>,
  ) {
    await this.assertOwnedShop(ownerId, shopId);
    await this.database.query(
      `UPDATE shops
       SET name = COALESCE($3, name),
           location = COALESCE($4, location),
           address = COALESCE($5, address),
           category = COALESCE($6, category),
           image = COALESCE($7, image)
       WHERE id = $1 AND owner_user_id = $2`,
      [
        shopId,
        ownerId,
        input.name ?? null,
        input.location ?? null,
        input.address ?? null,
        input.category ?? null,
        input.image ?? null,
      ],
    );
    return this.getShop(shopId);
  }

  async createService(
    ownerId: string,
    shopId: string,
    input: ServiceInput,
  ) {
    await this.assertOwnedShop(ownerId, shopId);
    const id = this.makeId(input.name);
    await this.database.query(
      `INSERT INTO services (id, shop_id, name, description, duration, price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, shopId, input.name, input.description, input.duration, input.price],
    );
    return {
      id,
      ...input,
    };
  }

  async updateService(
    ownerId: string,
    shopId: string,
    serviceId: string,
    input: Partial<ServiceInput>,
  ) {
    await this.assertOwnedShop(ownerId, shopId);
    const result = await this.database.query(
      `UPDATE services
       SET name = COALESCE($4, name),
           description = COALESCE($5, description),
           duration = COALESCE($6, duration),
           price = COALESCE($7, price)
       WHERE shop_id = $1 AND id = $2
         AND EXISTS (
           SELECT 1 FROM shops
           WHERE shops.id = $1 AND shops.owner_user_id = $3
         )
       RETURNING id, name, description, duration, price`,
      [
        shopId,
        serviceId,
        ownerId,
        input.name ?? null,
        input.description ?? null,
        input.duration ?? null,
        input.price ?? null,
      ],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Service not found');
    }
    return result.rows[0];
  }

  async deleteService(ownerId: string, shopId: string, serviceId: string) {
    await this.assertOwnedShop(ownerId, shopId);
    try {
      const result = await this.database.query(
        `DELETE FROM services
         WHERE shop_id = $1 AND id = $2
           AND EXISTS (
             SELECT 1 FROM shops
             WHERE shops.id = $1 AND shops.owner_user_id = $3
           )`,
        [shopId, serviceId, ownerId],
      );
      if (!result.rowCount) {
        throw new NotFoundException('Service not found');
      }
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'A service with existing bookings cannot be removed',
        );
      }
      throw error;
    }
    return { ok: true };
  }

  async createStaff(ownerId: string, shopId: string, input: StaffInput) {
    await this.assertOwnedShop(ownerId, shopId);
    const id = this.makeId(input.name);
    const initials = getInitials(input.name);
    await this.database.query(
      `INSERT INTO staff (id, shop_id, name, role, initials, rating)
       VALUES ($1, $2, $3, $4, $5, 5.0)`,
      [id, shopId, input.name, input.role, initials],
    );
    return {
      id,
      ...input,
      initials,
      rating: 5,
    };
  }

  async updateStaff(
    ownerId: string,
    shopId: string,
    staffId: string,
    input: Partial<StaffInput>,
  ) {
    await this.assertOwnedShop(ownerId, shopId);
    const result = await this.database.query(
      `UPDATE staff
       SET name = COALESCE($4, name),
           role = COALESCE($5, role),
           initials = COALESCE($6, initials)
       WHERE shop_id = $1 AND id = $2
         AND EXISTS (
           SELECT 1 FROM shops
           WHERE shops.id = $1 AND shops.owner_user_id = $3
         )
       RETURNING id, name, role, initials, rating::float8 AS rating`,
      [
        shopId,
        staffId,
        ownerId,
        input.name ?? null,
        input.role ?? null,
        input.name ? getInitials(input.name) : null,
      ],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Staff member not found');
    }
    return result.rows[0];
  }

  async deleteStaff(ownerId: string, shopId: string, staffId: string) {
    await this.assertOwnedShop(ownerId, shopId);
    try {
      const result = await this.database.query(
        `DELETE FROM staff
         WHERE shop_id = $1 AND id = $2
           AND EXISTS (
             SELECT 1 FROM shops
             WHERE shops.id = $1 AND shops.owner_user_id = $3
           )`,
        [shopId, staffId, ownerId],
      );
      if (!result.rowCount) {
        throw new NotFoundException('Staff member not found');
      }
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'A staff member with existing bookings cannot be removed',
        );
      }
      throw error;
    }
    return { ok: true };
  }

  async getShopBookings(ownerId: string, shopId: string) {
    await this.assertOwnedShop(ownerId, shopId);
    const result = await this.database.query<{
      reference: string;
      customer_name: string;
      customer_email: string;
      service_name: string;
      staff_name: string;
      starts_at: Date;
      status: string;
    }>(
      `SELECT bookings.reference, users.name AS customer_name,
              users.email AS customer_email, services.name AS service_name,
              staff.name AS staff_name, bookings.starts_at, bookings.status
       FROM bookings
       JOIN users ON users.id = bookings.user_id
       JOIN services ON services.id = bookings.service_id
       JOIN staff ON staff.id = bookings.staff_id
       WHERE bookings.shop_id = $1
       ORDER BY bookings.starts_at DESC`,
      [shopId],
    );
    return {
      bookings: result.rows.map((booking) => {
        const startsAt = new Date(booking.starts_at);
        return {
          reference: booking.reference,
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          serviceName: booking.service_name,
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
          status: booking.status,
        };
      }),
    };
  }

  private async assertOwnedShop(ownerId: string, shopId: string): Promise<void> {
    const result = await this.database.query(
      'SELECT 1 FROM shops WHERE id = $1 AND owner_user_id = $2',
      [shopId, ownerId],
    );
    if (!result.rowCount) {
      throw new NotFoundException('Shop not found');
    }
  }

  private makeId(value: string): string {
    const slug = value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 45);
    return `${slug || 'item'}-${randomUUID().slice(0, 12)}`;
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === '23503';
}

const shopSelect = `
  SELECT
    shops.id,
    shops.name,
    shops.location,
    shops.address,
    shops.rating::float8 AS rating,
    shops.reviews,
    shops.category,
    shops.open_label AS open,
    shops.image,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', services.id,
        'name', services.name,
        'description', services.description,
        'duration', services.duration,
        'price', services.price
      ) ORDER BY services.name)
      FROM services
      WHERE services.shop_id = shops.id
    ), '[]'::json) AS services,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', staff.id,
        'name', staff.name,
        'role', staff.role,
        'initials', staff.initials,
        'rating', staff.rating::float8
      ) ORDER BY staff.name)
      FROM staff
      WHERE staff.shop_id = shops.id
    ), '[]'::json) AS staff
  FROM shops`;
