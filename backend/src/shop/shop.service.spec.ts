import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { DatabaseService } from '../database/database.service';
import { ShopService } from './shop.service';

describe('ShopService ownership', () => {
  let service: ShopService;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: DatabaseService, useValue: { query } },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  it('does not update a shop not owned by the requesting account', async () => {
    await expect(
      service.updateShop('another-owner', 'private-shop', {
        name: 'Changed name',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      'WHERE id = $1 AND owner_user_id = $2',
    );
    expect(query.mock.calls[0][1]).toEqual([
      'private-shop',
      'another-owner',
    ]);
  });

  it('does not return bookings for a shop the owner does not own', async () => {
    await expect(
      service.getShopBookings('another-owner', 'private-shop'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([
      'private-shop',
      'another-owner',
    ]);
  });
});
