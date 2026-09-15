import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gameTokenBalance: true,
        examCreditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    return {
      ...user,
      isUnlimited: user.role === Role.ADMIN,
    };
  }

  async addGameTokens(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gameTokenBalance: { increment: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'GAME_TOKEN',
          amount: quantity,
          type: 'PURCHASE',
          note: note ?? `Pembelian ${quantity} Token Game`,
        },
      });

      return user;
    });
  }

  async deductGameTokens(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      if (current.role === Role.ADMIN) {
        return current;
      }

      if (current.gameTokenBalance < quantity) {
        throw new Error('Saldo Token Game tidak mencukupi');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gameTokenBalance: { decrement: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'GAME_TOKEN',
          amount: -quantity,
          type: 'CONSUME_GAME_LIMIT',
          note: note ?? 'Pengurangan token untuk membuka batas kartu game',
        },
      });

      return user;
    });
  }

  async addExamCredits(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          examCreditBalance: { increment: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'EXAM_CREDIT',
          amount: quantity,
          type: 'PURCHASE',
          note: note ?? `Pembelian ${quantity} Kredit Ujian`,
        },
      });

      return user;
    });
  }

  async deductExamCredits(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      if (current.role === Role.ADMIN) {
        return current;
      }

      if (current.examCreditBalance < quantity) {
        throw new Error('Saldo Kredit Ujian tidak mencukupi');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          examCreditBalance: { decrement: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'EXAM_CREDIT',
          amount: -quantity,
          type: 'CONSUME_EXAM',
          note: note ?? 'Pengurangan kredit untuk publikasi mode ujian',
        },
      });

      return user;
    });
  }
}
