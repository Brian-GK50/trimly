import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/validation';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BookingsService } from './bookings.service';

const bookingSchema = z.object({
  shopId: z.string().min(1).max(80),
  serviceId: z.string().min(1).max(80),
  staffId: z.string().min(1).max(80),
  startsAt: z.string().datetime({ offset: true }),
});

@Controller('bookings')
@UseGuards(SessionGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  getBookings(@Req() request: AuthenticatedRequest) {
    return this.bookingsService.getBookings(request.user!);
  }

  @Post()
  createBooking(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.bookingsService.createBooking(
      request.user!,
      parseBody(bookingSchema, body),
    );
  }
}
