import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getProductPrice(productType: ProductType): number {
    if (productType === 'GAME_TOKEN') {
      const price = this.configService.get<number>('GAME_TOKEN_PRICE');
      return price ? Number(price) : 5000;
    }
    if (productType === 'EXAM_CREDIT') {
      const price = this.configService.get<number>('EXAM_CREDIT_PRICE');
      return price ? Number(price) : 14900;
    }
    return 5000;
  }

  async createOrder(userId: string, dto: CreatePaymentOrderDto) {
    const quantity = dto.quantity ?? 1;
    const unitPrice = this.getProductPrice(dto.productType);
    const totalPrice = quantity * unitPrice;

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        productType: dto.productType,
        quantity,
        price: totalPrice,
        status: 'PENDING',
        paymentMethod: dto.paymentMethod ?? 'MANUAL_TRANSFER',
        proofImageUrl: dto.proofImageUrl,
      },
    });

    const productName =
      dto.productType === 'GAME_TOKEN'
        ? 'Token Game (Buka Kuota Kartu)'
        : 'Kredit Ujian (Publikasi Mode Ujian 7 Hari)';

    return {
      message: `Pesanan pembelian ${quantity}x ${productName} berhasil dibuat.`,
      order,
      instructions: {
        totalPrice,
        unitPrice,
        productType: dto.productType,
        quantity,
        bankName: 'Mandiri / BCA',
        accountNumber:
          '1370016948529 (Mandiri) a.n. Albertus Magnus Dony Putra Perkasa',
        notes:
          'Transfer tepat sesuai nominal dan unggah screenshot bukti transfer.',
      },
    };
  }

  async submitProof(userId: string, orderId: string, proofImageUrl: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bukan pemilik pesanan ini');
    }

    if (order.status === 'PAID') {
      throw new BadRequestException('Pesanan sudah disetujui dan dibayar');
    }

    return this.prisma.paymentOrder.update({
      where: { id: orderId },
      data: { proofImageUrl },
    });
  }

  async getMyOrders(userId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyTransactions(userId: string) {
    return this.prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getPricingPackages() {
    return [
      {
        productType: 'GAME_TOKEN',
        name: 'Token Game Interaktif',
        price: this.getProductPrice('GAME_TOKEN'),
        description:
          'Membuka kuota tak terbatas (>10 soal) untuk set kartu / game Smart TV.',
      },
      {
        productType: 'EXAM_CREDIT',
        name: 'Kredit Publikasi Mode Ujian',
        price: this.getProductPrice('EXAM_CREDIT'),
        description:
          'Mempublikasikan 1 paket ujian online anti-curang aktif selama 7 hari untuk 1 kelas.',
      },
    ];
  }

  async approveOrder(orderId: string, adminNote?: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status === 'PAID') {
      throw new BadRequestException('Pesanan ini sudah berstatus PAID');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          adminNote,
        },
      });

      // Tambahkan saldo sesuai jenis produk
      if (order.productType === 'GAME_TOKEN') {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            gameTokenBalance: { increment: order.quantity },
          },
        });
      } else {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            examCreditBalance: { increment: order.quantity },
          },
        });
      }

      await tx.tokenTransaction.create({
        data: {
          userId: order.userId,
          productType: order.productType,
          amount: order.quantity,
          type: 'PURCHASE',
          note: `Pembelian ${order.quantity}x ${order.productType} (Order #${order.id})`,
        },
      });

      return {
        message: `Order #${order.id} berhasil disetujui. ${order.quantity}x ${order.productType} telah ditambahkan ke akun user.`,
        order: updatedOrder,
      };
    });
  }
}
