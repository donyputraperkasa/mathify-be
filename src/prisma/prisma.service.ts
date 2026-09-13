import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Terhubung ke database via Prisma.');
    } catch (error) {
      this.logger.error(
        'Gagal terhubung ke database pada inisialisasi awal:',
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
