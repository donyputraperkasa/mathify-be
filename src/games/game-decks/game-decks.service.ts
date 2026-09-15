import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AddCardDto } from './dto/add-card.dto';
import { CreateDeckDto } from './dto/create-deck.dto';

@Injectable()
export class GameDecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private get freeLimit(): number {
    const limit = this.configService.get<number>('FREE_GAME_QUESTION_LIMIT');
    return limit ? Number(limit) : 10;
  }

  private get gameTokenPrice(): number {
    const price = this.configService.get<number>('GAME_TOKEN_PRICE');
    return price ? Number(price) : 5000;
  }

  async getPublicDecks(search?: string, subject?: string) {
    const where: {
      isPublic: boolean;
      title?: { contains: string; mode: 'insensitive' };
      subject?: { equals: string; mode: 'insensitive' };
    } = { isPublic: true };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (subject) {
      where.subject = { equals: subject, mode: 'insensitive' };
    }

    return this.prisma.gameDeck.findMany({
      where,
      include: {
        _count: { select: { cards: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyDecks(userId: string) {
    return this.prisma.gameDeck.findMany({
      where: { userId },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDeckById(deckId: string, currentUserId?: string) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
      include: {
        user: { select: { id: true, name: true } },
        cards: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck kartu tidak ditemukan');
    }

    const isOwner = Boolean(currentUserId && deck.userId === currentUserId);
    const isUnlocked = deck.isTokenUnlocked || isOwner;
    const totalCards = deck.cards.length;

    // Jika belum di-unlock dan bukan owner, batasi maksimal kartu gratis
    let accessibleCards = deck.cards;
    let isLimited = false;

    if (!isUnlocked && totalCards > this.freeLimit) {
      accessibleCards = deck.cards.slice(0, this.freeLimit);
      isLimited = true;
    }

    return {
      ...deck,
      cards: accessibleCards,
      totalCards,
      freeLimit: this.freeLimit,
      isTokenUnlocked: deck.isTokenUnlocked,
      isLimited,
      unlockCostTokens: 1,
      unlockPriceRupiah: this.gameTokenPrice,
    };
  }

  async createDeck(userId: string, dto: CreateDeckDto) {
    const cards = dto.cards ?? [];

    const user = await this.usersService.findById(userId);
    const isAdmin = user?.role === Role.ADMIN;

    // Jika admin, deck otomatis unlocked tanpa syarat
    let isTokenUnlocked = isAdmin;
    if (!isAdmin && cards.length > this.freeLimit) {
      if (!user || user.gameTokenBalance < 1) {
        throw new BadRequestException(
          `Batas gratis adalah ${this.freeLimit} kartu. Anda memerlukan 1 Token Game (Rp ${this.gameTokenPrice.toLocaleString('id-ID')}) untuk membuat deck dengan lebih dari ${this.freeLimit} kartu. Saldo Token Game Anda saat ini: ${user?.gameTokenBalance ?? 0}`,
        );
      }
      await this.usersService.deductGameTokens(
        userId,
        1,
        `Buka batas soal deck: ${dto.title}`,
      );
      isTokenUnlocked = true;
    }

    return this.prisma.gameDeck.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        grade: dto.grade,
        gameType: dto.gameType ?? 'FLIP_CARD',
        isPublic: dto.isPublic ?? true,
        isTokenUnlocked,
        cards: {
          create: cards.map((c, index) => ({
            question: c.question,
            answer: c.answer,
            hint: c.hint,
            imageUrl: c.imageUrl,
            durationSeconds: c.durationSeconds ?? 30,
            order: index + 1,
          })),
        },
      },
      include: {
        cards: true,
      },
    });
  }

  async addCard(userId: string, deckId: string, dto: AddCardDto) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
      include: { _count: { select: { cards: true } } },
    });

    if (!deck) {
      throw new NotFoundException('Deck kartu tidak ditemukan');
    }

    if (deck.userId !== userId) {
      throw new ForbiddenException(
        'Hanya pembuat deck yang dapat menambahkan kartu',
      );
    }

    const currentCardCount = deck._count.cards;
    if (currentCardCount >= this.freeLimit && !deck.isTokenUnlocked) {
      const user = await this.usersService.findById(userId);
      if (user?.role !== Role.ADMIN) {
        throw new BadRequestException(
          `Deck telah mencapai batas kuota gratis (${this.freeLimit} kartu). Gunakan 1 Token Game (Rp ${this.gameTokenPrice.toLocaleString('id-ID')}) untuk membuka kuota tanpa batas.`,
        );
      }
    }

    return this.prisma.gameCard.create({
      data: {
        deckId,
        question: dto.question,
        answer: dto.answer,
        hint: dto.hint,
        imageUrl: dto.imageUrl,
        durationSeconds: dto.durationSeconds ?? 30,
        order: currentCardCount + 1,
      },
    });
  }

  async unlockDeckWithToken(userId: string, deckId: string) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck tidak ditemukan');
    }

    if (deck.isTokenUnlocked) {
      return { message: 'Deck ini sudah dalam status premium/unlocked', deck };
    }

    // Kurangi 1 token game
    await this.usersService.deductGameTokens(
      userId,
      1,
      `Buka kuota soal tak terbatas untuk deck: ${deck.title}`,
    );

    const updated = await this.prisma.gameDeck.update({
      where: { id: deckId },
      data: { isTokenUnlocked: true },
      include: { cards: true },
    });

    return {
      message: `Berhasil membuka kuota tak terbatas untuk deck ini menggunakan 1 Token Game (Rp ${this.gameTokenPrice.toLocaleString('id-ID')})!`,
      deck: updated,
    };
  }

  async deleteDeck(userId: string, deckId: string) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
    });
    if (!deck) {
      throw new NotFoundException('Deck tidak ditemukan');
    }
    if (deck.userId !== userId) {
      throw new ForbiddenException('Tidak berhak menghapus deck ini');
    }
    await this.prisma.gameDeck.delete({ where: { id: deckId } });
    return { message: 'Deck berhasil dihapus' };
  }
}
