import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BattleScorer } from './dto/battle-action.dto';
import { TvSessionsService } from './tv-sessions.service';

describe('TvSessionsService (Anti-Hack & Smart TV Sessions)', () => {
  let service: TvSessionsService;
  let prisma: {
    gameDeck: { findUnique: jest.Mock };
    gameSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const mockSession = {
    id: 'session-1',
    deckId: 'deck-1',
    hostUserId: 'teacher-123',
    roomCode: 'SAT789',
    hostControlKey: 'secret-teacher-key-uuid',
    selectedMode: 'MATH_BATTLE_2P',
    player1Name: 'Tim Biru',
    player2Name: 'Tim Merah',
    player1Score: 0,
    player2Score: 0,
    ropePosition: 0,
    targetDifference: 3,
    currentCardIndex: 0,
    winner: null,
    status: 'ACTIVE',
    deck: {
      title: 'Matematika Aljabar',
      subject: 'Matematika',
      grade: 'Kelas 7',
      isTokenUnlocked: true,
      cards: [
        { id: 'card-1', question: '2 + 2?', answer: '4', order: 1 },
        { id: 'card-2', question: '5 x 5?', answer: '25', order: 2 },
      ],
    },
    host: { id: 'teacher-123', name: 'Pak Guru' },
  };

  beforeEach(async () => {
    prisma = {
      gameDeck: { findUnique: jest.fn() },
      gameSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TvSessionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TvSessionsService>(TvSessionsService);
  });

  describe('Session Creation & Key Generation', () => {
    it('should generate a room code and a separate secret hostControlKey', async () => {
      prisma.gameDeck.findUnique.mockResolvedValue({
        id: 'deck-1',
        cards: [{ id: 'card-1' }],
      });
      prisma.gameSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession('teacher-123', {
        deckId: 'deck-1',
        selectedMode: 'MATH_BATTLE_2P',
      });

      expect(result.roomCode).toBeDefined();
      expect(result.hostControlKey).toBe('secret-teacher-key-uuid');
      expect(prisma.gameSession.create).toHaveBeenCalled();
    });
  });

  describe('Anti-Hack: TV Display Data Hiding', () => {
    it('should return presentation data for TV WITHOUT leaking hostControlKey', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(mockSession);

      const tvData = await service.getSessionByCode('SAT789');

      expect(tvData.roomCode).toBe('SAT789');
      expect(tvData.deckTitle).toBe('Matematika Aljabar');
      // Pastikan kunci kendali rahasia tidak bocor ke penonton / TV!
      expect((tvData as Record<string, any>).hostControlKey).toBeUndefined();
    });

    it('should throw NotFoundException if room code does not exist', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(null);

      await expect(service.getSessionByCode('WRONG1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Anti-Hack: Action Control Permission Verification', () => {
    it('should ALLOW card update if user is the teacher/owner', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(mockSession);
      prisma.gameSession.update.mockResolvedValue({
        ...mockSession,
        currentCardIndex: 1,
      });

      const updated = await service.updateCardIndex(
        'SAT789',
        1,
        'teacher-123',
        undefined,
      );
      expect(updated.currentCardIndex).toBe(1);
    });

    it('should ALLOW card update if request provides valid x-host-key', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(mockSession);
      prisma.gameSession.update.mockResolvedValue({
        ...mockSession,
        currentCardIndex: 1,
      });

      const updated = await service.updateCardIndex(
        'SAT789',
        1,
        undefined,
        'secret-teacher-key-uuid',
      );
      expect(updated.currentCardIndex).toBe(1);
    });

    it('should BLOCK unauthorized student attempt with 403 Forbidden', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(mockSession);

      // Siswa iseng tanpa login guru dan tanpa kunci rahasia
      await expect(
        service.updateCardIndex('SAT789', 1, 'iseng-student-id', 'fake-key'),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.gameSession.update).not.toHaveBeenCalled();
    });

    it('should BLOCK battle scoring manipulation if unauthorized', async () => {
      prisma.gameSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.awardBattlePoint(
          'SAT789',
          BattleScorer.PLAYER_1,
          undefined,
          'wrong-key',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.gameSession.update).not.toHaveBeenCalled();
    });
  });

  describe('Battle Mode Logic (Tarik Tambang Math)', () => {
    it('should adjust ropePosition and declare winner when target difference is reached', async () => {
      prisma.gameSession.findUnique.mockResolvedValue({
        ...mockSession,
        player1Score: 2,
        player2Score: 0,
        ropePosition: 2,
        targetDifference: 3,
      });

      prisma.gameSession.update.mockImplementation(({ data }: { data: any }) =>
        Promise.resolve({ ...mockSession, ...data }),
      );

      const result = await service.awardBattlePoint(
        'SAT789',
        BattleScorer.PLAYER_1,
        'teacher-123',
      );

      expect(result.ropePosition).toBe(1);
      expect(result.player1Score).toBe(3);
    });
  });
});
