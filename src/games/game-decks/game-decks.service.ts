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
import { UpdateDeckDto } from './dto/update-deck.dto';

function formatCard(card: any) {
  if (!card) return card;
  return {
    ...card,
    frontQuestion: card.frontQuestion ?? card.question,
    backAnswer: card.backAnswer ?? card.answer,
    orderIndex: card.orderIndex ?? card.order,
    timerSeconds: card.timerSeconds ?? card.durationSeconds,
    explanation: card.explanation ?? card.hint ?? '',
  };
}

function formatDeck(deck: any) {
  if (!deck) return deck;
  const cards = Array.isArray(deck.cards) ? deck.cards.map(formatCard) : [];
  const cardCount = deck._count?.cards ?? cards.length;
  return {
    ...deck,
    gradeLevel: deck.grade ?? deck.gradeLevel ?? '',
    cardCount,
    cards,
  };
}

@Injectable()
export class GameDecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private get freeLimit(): number {
    const limit = this.configService.get<number>('FREE_GAME_QUESTION_LIMIT');
    return limit ? Number(limit) : 8;
  }

  private get gameTokenPrice(): number {
    const price = this.configService.get<number>('GAME_TOKEN_PRICE');
    return price ? Number(price) : 2500;
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

    const decks = await this.prisma.gameDeck.findMany({
      where,
      include: {
        _count: { select: { cards: true } },
        user: { select: { id: true, name: true } },
        cards: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return decks.map(formatDeck);
  }

  async getMyDecks(userId: string) {
    const decks = await this.prisma.gameDeck.findMany({
      where: { userId },
      include: {
        _count: { select: { cards: true } },
        cards: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return decks.map(formatDeck);
  }

  async getDeckById(deckId: string, currentUserId?: string) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
      include: {
        user: { select: { id: true, name: true } },
        cards: {
          orderBy: { order: 'asc' },
        },
        _count: { select: { cards: true } },
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

    const formatted = formatDeck({
      ...deck,
      cards: accessibleCards,
    });

    return {
      ...formatted,
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

    const created = await this.prisma.gameDeck.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        grade: dto.gradeLevel ?? dto.grade,
        pinCode: dto.pinCode,
        gameType: dto.gameType ?? 'FLIP_CARD',
        isPublic: dto.isPublic ?? true,
        isTokenUnlocked,
        cards: {
          create: cards.map((c, index) => ({
            question: c.frontQuestion ?? c.question ?? '',
            answer: c.backAnswer ?? c.answer ?? '',
            hint: c.explanation ?? c.hint ?? null,
            imageUrl: c.imageUrl ?? null,
            durationSeconds: c.timerSeconds ?? c.durationSeconds ?? 30,
            order: c.orderIndex ?? c.order ?? index + 1,
          })),
        },
      },
      include: {
        cards: { orderBy: { order: 'asc' } },
        _count: { select: { cards: true } },
      },
    });

    return formatDeck(created);
  }

  async updateDeck(userId: string, deckId: string, dto: UpdateDeckDto) {
    const deck = await this.prisma.gameDeck.findUnique({
      where: { id: deckId },
      include: { cards: true },
    });

    if (!deck) {
      throw new NotFoundException('Deck kartu tidak ditemukan');
    }

    const user = await this.usersService.findById(userId);
    const isAdmin = user?.role === Role.ADMIN;
    if (deck.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Hanya pembuat deck atau admin yang dapat mengubah deck ini',
      );
    }

    const cards = dto.cards;
    let isTokenUnlocked = deck.isTokenUnlocked;

    if (cards && !isAdmin && cards.length > this.freeLimit && !isTokenUnlocked) {
      if (!user || user.gameTokenBalance < 1) {
        throw new BadRequestException(
          `Batas gratis adalah ${this.freeLimit} kartu. Anda memerlukan 1 Token Game (Rp ${this.gameTokenPrice.toLocaleString('id-ID')}) untuk menambah kartu lebih dari ${this.freeLimit}. Saldo Token Game Anda saat ini: ${user?.gameTokenBalance ?? 0}`,
        );
      }
      await this.usersService.deductGameTokens(
        userId,
        1,
        `Buka kuota soal deck: ${dto.title ?? deck.title}`,
      );
      isTokenUnlocked = true;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (cards && Array.isArray(cards)) {
        await tx.gameCard.deleteMany({ where: { deckId } });
        if (cards.length > 0) {
          await tx.gameCard.createMany({
            data: cards.map((c, idx) => ({
              deckId,
              question: c.frontQuestion ?? c.question ?? '',
              answer: c.backAnswer ?? c.answer ?? '',
              hint: c.explanation ?? c.hint ?? null,
              imageUrl: c.imageUrl ?? null,
              durationSeconds: c.timerSeconds ?? c.durationSeconds ?? 30,
              order: c.orderIndex ?? c.order ?? idx + 1,
            })),
          });
        }
      }

      return tx.gameDeck.update({
        where: { id: deckId },
        data: {
          title: dto.title ?? undefined,
          description:
            dto.description !== undefined ? dto.description : undefined,
          subject: dto.subject ?? undefined,
          grade: (dto.gradeLevel ?? dto.grade) ?? undefined,
          gameType: dto.gameType ?? undefined,
          isPublic: dto.isPublic !== undefined ? dto.isPublic : undefined,
          pinCode: dto.pinCode ?? undefined,
          isTokenUnlocked,
        },
        include: {
          cards: { orderBy: { order: 'asc' } },
          user: { select: { id: true, name: true } },
          _count: { select: { cards: true } },
        },
      });
    });

    return formatDeck(updated);
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
