import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/validation';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PaymentsService } from './payments.service';

const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().trim().min(9).max(20),
});

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mpesa/callback')
  callback(
    @Query('token') token: string | undefined,
    @Body() body: unknown,
  ) {
    return this.paymentsService.processCallback(token, body);
  }

  @Post('mpesa')
  @UseGuards(SessionGuard)
  startPayment(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.paymentsService.startPayment(
      request.user!,
      parseBody(paymentSchema, body),
    );
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  getPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.paymentsService.getPayment(request.user!, id);
  }
}
