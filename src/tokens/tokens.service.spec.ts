jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
  })),
}));

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';

describe('TokensService (Dynamic .env Pricing & Orders)', () => {
  let service: TokensService;
  let configService: { get: jest.Mock };
  let prisma: {
    paymentOrder: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    tokenTransaction: { create: jest.Mock; findMany: jest.Mock };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'GAME_TOKEN_PRICE') return 5000;
        if (key === 'EXAM_CREDIT_PRICE') return 14900;
        return undefined;
      }),
    };

    prisma = {
      paymentOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      tokenTransaction: { create: jest.fn(), findMany: jest.fn() },
      user: { update: jest.fn() },
      $transaction: jest.fn(
        <T>(cb: (tx: unknown) => Promise<T>): Promise<T> => {
          return cb(prisma);
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  describe('Dynamic Pricing from .env', () => {
    it('should read GAME_TOKEN price from .env config (5000)', () => {
      expect(service.getProductPrice('GAME_TOKEN')).toBe(5000);
      expect(configService.get).toHaveBeenCalledWith('GAME_TOKEN_PRICE');
    });

    it('should read EXAM_CREDIT price from .env config (14900)', () => {
      expect(service.getProductPrice('EXAM_CREDIT')).toBe(14900);
      expect(configService.get).toHaveBeenCalledWith('EXAM_CREDIT_PRICE');
    });

    it('should return dynamic pricing in getPricingPackages()', () => {
      const packages = service.getPricingPackages();
      expect(packages).toHaveLength(2);
      expect(packages[0].price).toBe(5000);
      expect(packages[1].price).toBe(14900);
    });
  });

  describe('Order Creation', () => {
    it('should calculate total price correctly based on unit price and quantity', async () => {
      prisma.paymentOrder.create.mockResolvedValue({
        id: 'order-123',
        userId: 'user-1',
        productType: 'GAME_TOKEN',
        quantity: 3,
        price: 15000,
        status: 'PENDING',
      });

      const res = await service.createOrder('user-1', {
        productType: 'GAME_TOKEN',
        quantity: 3,
      });

      expect(res.instructions.totalPrice).toBe(15000);
      expect(res.instructions.unitPrice).toBe(5000);
      expect(prisma.paymentOrder.create).toHaveBeenCalled();
      const createCalls = prisma.paymentOrder.create.mock.calls[0] as Array<{
        data: { price: number; quantity: number; productType: string };
      }>;
      expect(createCalls[0].data.price).toBe(15000);
      expect(createCalls[0].data.quantity).toBe(3);
      expect(createCalls[0].data.productType).toBe('GAME_TOKEN');
    });
  });

  describe('Approve Order (Manual Transfer Approval)', () => {
    it('should increase user gameTokenBalance and mark order as PAID', async () => {
      prisma.paymentOrder.findUnique.mockResolvedValue({
        id: 'order-123',
        userId: 'user-1',
        productType: 'GAME_TOKEN',
        quantity: 2,
        status: 'PENDING',
      });
      prisma.paymentOrder.update.mockResolvedValue({
        id: 'order-123',
        status: 'PAID',
      });

      const res = await service.approveOrder('order-123', 'Sudah diverifikasi');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gameTokenBalance: { increment: 2 } },
      });
      expect(prisma.tokenTransaction.create).toHaveBeenCalled();
      const txCalls = prisma.tokenTransaction.create.mock.calls[0] as Array<{
        data: { amount: number; type: string };
      }>;
      expect(txCalls[0].data.amount).toBe(2);
      expect(txCalls[0].data.type).toBe('PURCHASE');
      expect(res.order.status).toBe('PAID');
    });
  });
});
