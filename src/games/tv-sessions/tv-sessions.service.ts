import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameSession } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BattleScorer } from './dto/battle-action.dto';
import { CreateTvSessionDto } from './dto/create-tv-session.dto';

@Injectable()
export class TvSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private verifyHost(
    session: GameSession,
    currentUserId?: string,
    hostControlKey?: string,
  ) {
    const isOwner = Boolean(
      currentUserId && session.hostUserId === currentUserId,
    );
    const hasControlKey = Boolean(
      hostControlKey && session.hostControlKey === hostControlKey,
    );

    if (!isOwner && !hasControlKey) {
      throw new ForbiddenException(
        'Akses ditolak. Hanya Guru / Host pembuat room yang berhak mengontrol jalannya permainan!',
      );
    }
  }

  async createSession(userId: string, dto: CreateTvSessionDto) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: dto.deckId },
      include: { cards: true },
    });

    if (!deck) {
      throw new NotFoundException('Deck game tidak ditemukan');
    }

    if (deck.cards.length === 0) {
      throw new BadRequestException(
        'Deck belum memiliki kartu soal untuk dimainkan di Smart TV',
      );
    }

    const roomCode = this.generateRoomCode();
    const hostControlKey = randomUUID();

    const session = await this.prisma.gameSession.create({
      data: {
        deckId: dto.deckId,
        hostUserId: userId,
        roomCode,
        hostControlKey,
        selectedMode: dto.selectedMode ?? 'FLIP_CARD',
        player1Name: dto.player1Name ?? 'Tim Biru',
        player2Name: dto.player2Name ?? 'Tim Merah',
        targetDifference: dto.targetDifference ?? 3,
        currentCardIndex: 0,
        status: 'ACTIVE',
      },
      include: {
        deck: {
          include: {
            cards: {
              orderBy: { order: 'asc' },
              take: deck.isTokenUnlocked ? undefined : 10,
            },
          },
        },
      },
    });

    return {
      message: 'Sesi Smart TV berhasil dibuat',
      roomCode: session.roomCode,
      hostControlKey: session.hostControlKey, // Hanya dikembalikan ke pembuat (guru)
      tvUrl: `http://localhost:3000/tv/${session.roomCode}`,
      session,
    };
  }

  async getSessionByCode(roomCode: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { roomCode: roomCode.toUpperCase().trim() },
      include: {
        deck: {
          include: {
            cards: {
              orderBy: { order: 'asc' },
            },
          },
        },
        host: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Sesi Smart TV tidak ditemukan atau kode PIN salah',
      );
    }

    const isUnlocked = session.deck.isTokenUnlocked;
    const cards = isUnlocked
      ? session.deck.cards
      : session.deck.cards.slice(0, 10);

    return {
      id: session.id,
      roomCode: session.roomCode,
      status: session.status,
      selectedMode: session.selectedMode,
      currentCardIndex: session.currentCardIndex,
      deckTitle: session.deck.title,
      subject: session.deck.subject,
      grade: session.deck.grade,
      hostName: session.host.name,
      totalCards: cards.length,
      currentCard: cards[session.currentCardIndex] ?? null,
      cards,
      isTokenUnlocked: isUnlocked,

      // State khusus Battle 2 Siswa (Tarik Tambang)
      player1Name: session.player1Name,
      player2Name: session.player2Name,
      player1Score: session.player1Score,
      player2Score: session.player2Score,
      ropePosition: session.ropePosition,
      targetDifference: session.targetDifference,
      winner: session.winner,
    };
  }

  async updateCardIndex(
    sessionCode: string,
    nextIndex: number,
    currentUserId?: string,
    hostControlKey?: string,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      include: { deck: { include: { cards: true } } },
    });

    if (!session) {
      throw new NotFoundException('Sesi tidak ditemukan');
    }

    this.verifyHost(session, currentUserId, hostControlKey);

    const maxCards = session.deck.isTokenUnlocked
      ? session.deck.cards.length
      : Math.min(session.deck.cards.length, 10);

    const safeIndex = Math.max(0, Math.min(nextIndex, maxCards - 1));

    return this.prisma.gameSession.update({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      data: { currentCardIndex: safeIndex },
    });
  }

  async awardBattlePoint(
    sessionCode: string,
    scorer: BattleScorer,
    currentUserId?: string,
    hostControlKey?: string,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      include: { deck: { include: { cards: true } } },
    });

    if (!session) {
      throw new NotFoundException('Sesi game tidak ditemukan');
    }

    this.verifyHost(session, currentUserId, hostControlKey);

    if (session.winner) {
      throw new BadRequestException(
        `Ronde ini sudah selesai. Pemenangnya adalah ${session.winner}`,
      );
    }

    let p1Score = session.player1Score;
    let p2Score = session.player2Score;
    let rope = session.ropePosition;
    let winner: string | null = null;

    if (scorer === BattleScorer.PLAYER_1) {
      p1Score += 1;
      rope -= 1; // Tarik ke sisi Player 1 (kiri)
      if (rope <= -session.targetDifference) {
        winner = session.player1Name ?? 'Tim Biru';
      }
    } else {
      p2Score += 1;
      rope += 1; // Tarik ke sisi Player 2 (kanan)
      if (rope >= session.targetDifference) {
        winner = session.player2Name ?? 'Tim Merah';
      }
    }

    // Pindah ke soal berikutnya secara otomatis
    const maxCards = session.deck.isTokenUnlocked
      ? session.deck.cards.length
      : Math.min(session.deck.cards.length, 10);
    const nextCardIndex = Math.min(session.currentCardIndex + 1, maxCards - 1);

    return this.prisma.gameSession.update({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      data: {
        player1Score: p1Score,
        player2Score: p2Score,
        ropePosition: rope,
        winner,
        currentCardIndex: nextCardIndex,
      },
    });
  }

  async resetBattle(
    sessionCode: string,
    currentUserId?: string,
    hostControlKey?: string,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { roomCode: sessionCode.toUpperCase().trim() },
    });

    if (!session) {
      throw new NotFoundException('Sesi game tidak ditemukan');
    }

    this.verifyHost(session, currentUserId, hostControlKey);

    return this.prisma.gameSession.update({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      data: {
        player1Score: 0,
        player2Score: 0,
        ropePosition: 0,
        winner: null,
      },
    });
  }

  async finishSession(
    sessionCode: string,
    currentUserId?: string,
    hostControlKey?: string,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { roomCode: sessionCode.toUpperCase().trim() },
    });

    if (!session) {
      throw new NotFoundException('Sesi game tidak ditemukan');
    }

    this.verifyHost(session, currentUserId, hostControlKey);

    return this.prisma.gameSession.update({
      where: { roomCode: sessionCode.toUpperCase().trim() },
      data: { status: 'FINISHED' },
    });
  }
}
