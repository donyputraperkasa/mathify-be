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
      return price ? Number(price) : 2500;
    }
    if (productType === 'EXAM_CREDIT') {
      const price = this.configService.get<number>('EXAM_CREDIT_PRICE');
      return price ? Number(price) : 14900;
    }
    return 2500;
  }

  async createOrder(userId: string, dto: CreatePaymentOrderDto) {
    const quantity = dto.quantity ?? 1;
    const unitPrice = this.getProductPrice(dto.productType);
    const totalPrice =
      dto.price !== undefined && dto.price >= 0 ? dto.price : quantity * unitPrice;

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        productType: dto.productType,
        quantity,
        price: totalPrice,
        status: 'PENDING',
        paymentMethod: dto.paymentMethod ?? 'MANUAL_TRANSFER',
        proofImageUrl: dto.proofImageUrl,
        adminNote: dto.packageName ? `Paket: ${dto.packageName}` : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const productName =
      dto.packageName ??
      (dto.productType === 'GAME_TOKEN'
        ? 'Token Game (Buka Kuota Kartu)'
        : 'Kredit Ujian (Publikasi Mode Ujian 7 Hari)');

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

  async getAllOrdersForAdmin() {
    const orders = await this.prisma.paymentOrder.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            gameTokenBalance: true,
            examCreditBalance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((ord) => {
      const itemType = ord.productType === 'GAME_TOKEN' ? 'GAME' : 'EXAM';
      const packageName =
        ord.adminNote && ord.adminNote.startsWith('Paket: ')
          ? ord.adminNote.replace('Paket: ', '')
          : ord.productType === 'GAME_TOKEN'
            ? `${ord.quantity} Sesi Game TV`
            : `${ord.quantity} Kredit Ujian Online`;

      return {
        id: ord.id,
        userName: ord.user?.name || 'Guru Satelyd',
        userEmail: ord.user?.email || '',
        schoolName: 'Sekolah Pengajar',
        packageName,
        itemType,
        tokenAmount: ord.quantity,
        price: ord.price,
        paymentMethod: ord.paymentMethod || 'Manual Transfer',
        senderAccount: 'Rekening Transfer',
        referenceNumber: `REF-${ord.id.slice(-6).toUpperCase()}`,
        proofImageUrl: ord.proofImageUrl || '',
        createdAt: ord.createdAt.toISOString(),
        status:
          ord.status === 'PAID'
            ? 'APPROVED'
            : ord.status === 'REJECTED'
              ? 'REJECTED'
              : 'PENDING',
        rawStatus: ord.status,
        productType: ord.productType,
        quantity: ord.quantity,
        adminNote: ord.adminNote,
        paidAt: ord.paidAt,
        user: ord.user,
      };
    });
  }

  async rejectOrder(orderId: string, adminNote?: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status === 'PAID') {
      throw new BadRequestException(
        'Pesanan yang sudah dibayar tidak dapat ditolak',
      );
    }

    const updated = await this.prisma.paymentOrder.update({
      where: { id: orderId },
      data: {
        status: 'REJECTED',
        adminNote: adminNote || 'Ditolak oleh Admin',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      message: `Order #${orderId} telah ditolak.`,
      order: updated,
    };
  }
}

