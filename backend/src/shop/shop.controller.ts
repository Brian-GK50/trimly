import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/validation';
import { OwnerGuard } from '../auth/owner.guard';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ShopService, type ServiceInput, type StaffInput } from './shop.service';

const createShopSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(240),
  category: z.string().trim().min(2).max(80),
  image: z.string().trim().min(1).max(500).default('linear-gradient(140deg, #39332b, #a07b53)'),
});
const updateShopSchema = createShopSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  'Provide at least one field to update',
);
const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  duration: z.number().int().min(5).max(480),
  price: z.number().int().positive().max(1_000_000),
});
const updateServiceSchema = serviceSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  'Provide at least one field to update',
);
const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(100),
});
const updateStaffSchema = staffSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  'Provide at least one field to update',
);

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('mine')
  @UseGuards(SessionGuard, OwnerGuard)
  async getOwnedShops(@Req() request: AuthenticatedRequest) {
    return { shops: await this.shopService.getOwnedShops(request.user!.id) };
  }

  @Get()
  async getShops() {
    return { shops: await this.shopService.getShops() };
  }

  @Get(':id')
  async getShop(@Param('id') id: string) {
    const shop = await this.shopService.getShop(id);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return { shop };
  }

  @Patch(':id')
  @UseGuards(SessionGuard, OwnerGuard)
  async updateShop(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const shop = await this.shopService.updateShop(
      request.user!.id,
      id,
      parseBody(updateShopSchema, body),
    );
    return { shop };
  }

  @Get(':shopId/bookings')
  @UseGuards(SessionGuard, OwnerGuard)
  getShopBookings(
    @Param('shopId') shopId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.shopService.getShopBookings(request.user!.id, shopId);
  }

  @Post(':shopId/services')
  @UseGuards(SessionGuard, OwnerGuard)
  async createService(
    @Param('shopId') shopId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const service = await this.shopService.createService(
      request.user!.id,
      shopId,
      parseBody(serviceSchema, body) satisfies ServiceInput,
    );
    return { service };
  }

  @Patch(':shopId/services/:serviceId')
  @UseGuards(SessionGuard, OwnerGuard)
  async updateService(
    @Param('shopId') shopId: string,
    @Param('serviceId') serviceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const service = await this.shopService.updateService(
      request.user!.id,
      shopId,
      serviceId,
      parseBody(updateServiceSchema, body),
    );
    return { service };
  }

  @Delete(':shopId/services/:serviceId')
  @UseGuards(SessionGuard, OwnerGuard)
  deleteService(
    @Param('shopId') shopId: string,
    @Param('serviceId') serviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.shopService.deleteService(request.user!.id, shopId, serviceId);
  }

  @Post(':shopId/staff')
  @UseGuards(SessionGuard, OwnerGuard)
  async createStaff(
    @Param('shopId') shopId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const staff = await this.shopService.createStaff(
      request.user!.id,
      shopId,
      parseBody(staffSchema, body) satisfies StaffInput,
    );
    return { staff };
  }

  @Patch(':shopId/staff/:staffId')
  @UseGuards(SessionGuard, OwnerGuard)
  async updateStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const staff = await this.shopService.updateStaff(
      request.user!.id,
      shopId,
      staffId,
      parseBody(updateStaffSchema, body),
    );
    return { staff };
  }

  @Delete(':shopId/staff/:staffId')
  @UseGuards(SessionGuard, OwnerGuard)
  deleteStaff(
    @Param('shopId') shopId: string,
    @Param('staffId') staffId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.shopService.deleteStaff(request.user!.id, shopId, staffId);
  }

  @Post()
  @UseGuards(SessionGuard, OwnerGuard)
  async createShop(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const shop = await this.shopService.createShop(
      parseBody(createShopSchema, body),
      request.user!.id,
    );
    return { shop };
  }
}
