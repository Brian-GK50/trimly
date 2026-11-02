import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const callbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      CheckoutRequestID: z.string().min(1),
      ResultCode: z.number().int(),
      CallbackMetadata: z.object({
        Item: z.array(z.object({
          Name: z.string(),
          Value: z.union([z.string(), z.number()]),
        })),
      }).optional(),
    }),
  }),
});

const logger = new Logger('PaymentsService');

type PaymentConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
};

type BookingForPayment = {
  id: string;
  reference: string;
  deposit: number | string;
};

type CallbackPayment = {
  id: string;
  booking_id: string;
  amount: number | string;
  phone: string;
  status: string;
  booking_status: string;
  expires_at: Date;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly database: DatabaseService) {}

  async startPayment(
    user: AuthenticatedUser,
    input: { bookingId: string; phone: string },
  ) {
    const phone = normalizeKenyanPhone(input.phone);
    if (!phone) {
      throw new BadRequestException(
        'Enter a valid Kenyan M-PESA phone number',
      );
    }

    const bookingResult = await this.database.query<BookingForPayment>(
      `SELECT id, reference, deposit
       FROM bookings
       WHERE id = $1 AND user_id = $2
         AND status = 'PENDING_PAYMENT' AND expires_at > now()`,
      [input.bookingId, user.id],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      throw new NotFoundException(
        'Booking not found or its payment hold has expired',
      );
    }

    const paymentId = randomUUID();
    try {
      await this.database.query(
        `INSERT INTO payments (id, booking_id, amount, phone, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [paymentId, booking.id, Number(booking.deposit), phone],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A payment request is already pending for this booking',
        );
      }
      throw error;
    }

    try {
      const result = await this.requestStkPush({
        phone,
        amount: Number(booking.deposit),
        reference: booking.reference,
      });
      await this.database.query(
        `UPDATE payments
         SET merchant_request_id = $1, checkout_request_id = $2, updated_at = now()
         WHERE id = $3`,
        [result.merchantRequestId, result.checkoutRequestId, paymentId],
      );
    } catch (error) {
      await this.database.query(
        `UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = $1`,
        [paymentId],
      );
      throw error;
    }

    return { payment: { id: paymentId, status: 'pending' } };
  }

  async getPayment(user: AuthenticatedUser, id: string) {
    const result = await this.database.query<{
      id: string;
      status: string;
      reference: string;
    }>(
      `SELECT payments.id, payments.status, bookings.reference
       FROM payments
       JOIN bookings ON bookings.id = payments.booking_id
       WHERE payments.id = $1 AND bookings.user_id = $2`,
      [id, user.id],
    );
    const payment = result.rows[0];
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return {
      payment: {
        id: payment.id,
        status: payment.status.toLowerCase(),
        reference: payment.reference,
      },
    };
  }

  async processCallback(token: string | undefined, body: unknown) {
    this.verifyCallbackToken(token);
    const parsed = callbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid M-PESA callback payload');
    }

    const callback = parsed.data.Body.stkCallback;
    const metadata = new Map(
      (callback.CallbackMetadata?.Item ?? []).map((item) => [
        item.Name,
        item.Value,
      ]),
    );
    const amount = metadata.get('Amount');
    const phoneValue = metadata.get('PhoneNumber');
    const receiptValue = metadata.get('MpesaReceiptNumber');

    await this.database.withTransaction(async (client) => {
      const result = await client.query<CallbackPayment>(
        `SELECT payments.id, payments.booking_id, payments.amount, payments.phone,
                payments.status, bookings.status AS booking_status, bookings.expires_at
         FROM payments
         JOIN bookings ON bookings.id = payments.booking_id
         WHERE payments.checkout_request_id = $1
         FOR UPDATE OF payments, bookings`,
        [callback.CheckoutRequestID],
      );
      const payment = result.rows[0];
      if (!payment) {
        throw new NotFoundException('Payment request not found');
      }
      if (payment.status !== 'PENDING') {
        return;
      }

      if (callback.ResultCode === 0) {
        const paymentMatches = Number(amount) === Number(payment.amount)
          && normalizeKenyanPhone(String(phoneValue ?? '')) === payment.phone;
        if (!paymentMatches) {
          throw new BadRequestException(
            'M-PESA callback details do not match the payment',
          );
        }

        const withinHold = payment.booking_status === 'PENDING_PAYMENT'
          && new Date(payment.expires_at).getTime() > Date.now();
        await client.query(
          `UPDATE payments SET status = $1, receipt_number = $2, updated_at = now()
           WHERE id = $3`,
          [
            withinHold ? 'COMPLETED' : 'REFUND_REQUIRED',
            receiptValue == null ? null : String(receiptValue),
            payment.id,
          ],
        );
        if (withinHold) {
          await client.query(
            "UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1",
            [payment.booking_id],
          );
        } else if (payment.booking_status === 'PENDING_PAYMENT') {
          await client.query(
            "UPDATE bookings SET status = 'EXPIRED' WHERE id = $1",
            [payment.booking_id],
          );
        }
      } else {
        await client.query(
          `UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = $1`,
          [payment.id],
        );
        if (payment.booking_status === 'PENDING_PAYMENT') {
          await client.query(
            "UPDATE bookings SET status = 'CANCELLED' WHERE id = $1",
            [payment.booking_id],
          );
        }
      }
    });

    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  private getConfig(): PaymentConfig {
    const environment = process.env.MPESA_ENV ?? 'sandbox';
    if (environment !== 'sandbox' && environment !== 'production') {
      throw new ServiceUnavailableException(
        'MPESA_ENV must be sandbox or production',
      );
    }
    const required: Array<[string, string | undefined]> = [
      ['MPESA_CONSUMER_KEY', process.env.MPESA_CONSUMER_KEY],
      ['MPESA_CONSUMER_SECRET', process.env.MPESA_CONSUMER_SECRET],
      ['MPESA_SHORTCODE', process.env.MPESA_SHORTCODE],
      ['MPESA_PASSKEY', process.env.MPESA_PASSKEY],
      ['MPESA_CALLBACK_URL', process.env.MPESA_CALLBACK_URL],
      ['MPESA_CALLBACK_TOKEN', process.env.MPESA_CALLBACK_TOKEN],
    ];
    const missing = required
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `M-PESA is not configured. Set: ${missing.join(', ')}`,
      );
    }

    const callbackUrl = process.env.MPESA_CALLBACK_URL!;
    const callbackToken = process.env.MPESA_CALLBACK_TOKEN!;
    let url: URL;
    try {
      url = new URL(callbackUrl);
    } catch {
      throw new ServiceUnavailableException(
        'MPESA_CALLBACK_URL must be a valid public callback URL',
      );
    }
    if (url.searchParams.get('token') !== callbackToken) {
      throw new ServiceUnavailableException(
        'MPESA_CALLBACK_URL must include the configured callback token',
      );
    }

    return {
      baseUrl: environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke',
      consumerKey: process.env.MPESA_CONSUMER_KEY!,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
      shortcode: process.env.MPESA_SHORTCODE!,
      passkey: process.env.MPESA_PASSKEY!,
      callbackUrl,
    };
  }

  private async requestStkPush(input: {
    phone: string;
    amount: number;
    reference: string;
  }): Promise<{ merchantRequestId: string; checkoutRequestId: string }> {
    const config = this.getConfig();
    const accessToken = await this.getAccessToken(config);
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((parts, part) => {
        parts[part.type] = part.value;
        return parts;
      }, {});
    const timestampValue = `${timestamp.year}${timestamp.month}${timestamp.day}${timestamp.hour}${timestamp.minute}${timestamp.second}`;
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestampValue}`,
    ).toString('base64');

    try {
      const response = await axios.post<{
        ResponseCode?: string;
        ResponseDescription?: string;
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
      }>(
        `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestampValue,
          TransactionType: 'CustomerPayBillOnline',
          Amount: input.amount,
          PartyA: input.phone,
          PartyB: config.shortcode,
          PhoneNumber: input.phone,
          CallBackURL: config.callbackUrl,
          AccountReference: input.reference,
          TransactionDesc: `Trimly booking ${input.reference}`,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 20_000,
        },
      );

      const { MerchantRequestID, CheckoutRequestID } = response.data;
      if (response.data.ResponseCode !== '0' || !MerchantRequestID || !CheckoutRequestID) {
        throw new Error(
          response.data.ResponseDescription ?? 'Daraja rejected the STK request',
        );
      }
      return {
        merchantRequestId: MerchantRequestID,
        checkoutRequestId: CheckoutRequestID,
      };
    } catch (error) {
      logger.error(
        'M-PESA STK request failed',
        axios.isAxiosError(error)
          ? `status=${error.response?.status ?? 'unknown'} code=${error.code ?? 'unknown'}`
          : error instanceof Error ? error.message : 'Unknown error',
      );
      throw new BadGatewayException(
        'Unable to start the M-PESA payment. Please try again.',
      );
    }
  }

  private async getAccessToken(config: PaymentConfig): Promise<string> {
    try {
      const response = await axios.get<{ access_token?: string }>(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          auth: {
            username: config.consumerKey,
            password: config.consumerSecret,
          },
          timeout: 15_000,
        },
      );
      if (!response.data.access_token) {
        throw new Error('Daraja response did not include an access token');
      }
      return response.data.access_token;
    } catch (error) {
      logger.error(
        'M-PESA OAuth request failed',
        axios.isAxiosError(error)
          ? `status=${error.response?.status ?? 'unknown'} code=${error.code ?? 'unknown'}`
          : error instanceof Error ? error.message : 'Unknown error',
      );
      throw new BadGatewayException('Unable to connect to the M-PESA service');
    }
  }

  private verifyCallbackToken(received: string | undefined): void {
    const expected = process.env.MPESA_CALLBACK_TOKEN;
    if (!expected || !received) {
      throw new UnauthorizedException('Unauthorized callback');
    }
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    if (
      expectedBytes.length !== receivedBytes.length
      || !timingSafeEqual(expectedBytes, receivedBytes)
    ) {
      throw new UnauthorizedException('Unauthorized callback');
    }
  }
}

function normalizeKenyanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }
  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === '23505';
}
