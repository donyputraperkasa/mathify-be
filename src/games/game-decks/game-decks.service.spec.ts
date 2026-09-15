jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
  })),
}));

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { GameDecksService } from './game-decks.service';

describe('GameDecksService (Free Limit & Token Unlock)', () => {
  let service: GameDecksService;
  let prisma: {
    gameDeck: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    gameCard: { create: jest.Mock };
  };
  let usersService: {
    findById: jest.Mock;
    deductGameTokens: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      gameDeck: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      gameCard: { create: jest.fn() },
    };

    usersService = {
      findById: jest.fn(),
      deductGameTokens: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'FREE_GAME_QUESTION_LIMIT') return 10;
        if (key === 'GAME_TOKEN_PRICE') return 5000;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameDecksService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<GameDecksService>(GameDecksService);
  });

  describe('Deck Creation & Limits', () => {
    it('should allow creating a deck with <= 10 cards for free without token deduction', async () => {
      prisma.gameDeck.create.mockResolvedValue({
        id: 'deck-free',
        title: 'Aljabar Dasar',
        isTokenUnlocked: false,
      });

      const cards = Array.from({ length: 10 }, (_, i) => ({
        question: `Q${i + 1}`,
        answer: `A${i + 1}`,
      }));

      await service.createDeck('user-1', {
        title: 'Aljabar Dasar',
        cards,
      });

      expect(usersService.deductGameTokens).not.toHaveBeenCalled();
      expect(prisma.gameDeck.create).toHaveBeenCalled();
      const lastCall = prisma.gameDeck.create.mock.calls[0] as Array<{
        data: { isTokenUnlocked: boolean };
      }>;
      expect(lastCall[0].data.isTokenUnlocked).toBe(false);
    });

    it('should throw BadRequestException if creating > 10 cards and user has 0 tokens', async () => {
      usersService.findById.mockResolvedValue({
        id: 'user-1',
        gameTokenBalance: 0,
      });

      const cards = Array.from({ length: 11 }, (_, i) => ({
        question: `Q${i + 1}`,
        answer: `A${i + 1}`,
      }));

      await expect(
        service.createDeck('user-1', {
          title: 'Deck Panjang',
          cards,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.gameDeck.create).not.toHaveBeenCalled();
    });

    it('should deduct 1 token and unlock deck if creating > 10 cards and user has balance', async () => {
      usersService.findById.mockResolvedValue({
        id: 'user-1',
        gameTokenBalance: 2,
      });
      prisma.gameDeck.create.mockResolvedValue({
        id: 'deck-premium',
        isTokenUnlocked: true,
      });

      const cards = Array.from({ length: 15 }, (_, i) => ({
        question: `Q${i + 1}`,
        answer: `A${i + 1}`,
      }));

      await service.createDeck('user-1', {
        title: 'Deck Panjang Berbayar',
        cards,
      });

      expect(usersService.deductGameTokens).toHaveBeenCalledWith(
        'user-1',
        1,
        expect.any(String),
      );
      expect(prisma.gameDeck.create).toHaveBeenCalled();
      const lastCall = prisma.gameDeck.create.mock.calls[0] as Array<{
        data: { isTokenUnlocked: boolean };
      }>;
      expect(lastCall[0].data.isTokenUnlocked).toBe(true);
    });
  });

  describe('Deck Viewing & 10-Card Cap', () => {
    it('should slice cards to 10 if deck is locked and viewer is not the owner', async () => {
      const allCards = Array.from({ length: 20 }, (_, i) => ({
        id: `c-${i + 1}`,
        order: i + 1,
      }));

      prisma.gameDeck.findUnique.mockResolvedValue({
        id: 'deck-public',
        userId: 'other-user',
        isTokenUnlocked: false,
        cards: allCards,
        user: { id: 'other-user', name: 'Other User' },
      });

      const result = await service.getDeckById('deck-public', 'visitor-user');

      expect(result.totalCards).toBe(20);
      expect(result.cards).toHaveLength(10);
      expect(result.isLimited).toBe(true);
    });
  });
});
