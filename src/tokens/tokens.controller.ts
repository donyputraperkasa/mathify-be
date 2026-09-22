import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { SubmitProofDto } from './dto/submit-proof.dto';
import { TokensService } from './tokens.service';

@ApiTags('Tokens & Manual Payments (Beli Token & Kredit Ujian)')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('pricing')
  @ApiOperation({
    summary:
      'Get pricing packages (Token Game Rp 5.000 & Kredit Ujian Rp 14.900)',
  })
  @ApiResponse({ status: 200, description: 'Package pricing list returned' })
  getPricingPackages() {
    return this.tokensService.getPricingPackages();
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a purchase order (Beli Token Game Rp 5.000 atau Kredit Ujian Rp 14.900)',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.tokensService.createOrder(userId, dto);
  }

  @Post('orders/:id/proof')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload payment proof (Unggah Screenshot Bukti Transfer Bank)',
  })
  async submitProof(
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.tokensService.submitProof(userId, orderId, dto.proofImageUrl);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get purchase history (Riwayat Pesanan Pembelian Saya)',
  })
  async getMyOrders(@CurrentUser('sub') userId: string) {
    return this.tokensService.getMyOrders(userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get transaction history (Riwayat Mutasi Token Game & Kredit Ujian)',
  })
  async getMyTransactions(@CurrentUser('sub') userId: string) {
    return this.tokensService.getMyTransactions(userId);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin: Get all purchase orders (Pantau Semua Pesanan Pembelian Guru & Screenshot Transfer)',
  })
  async getAllOrders() {
    return this.tokensService.getAllOrdersForAdmin();
  }

  @Patch('orders/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin: Approve payment order (Setujui Pembayaran & Isi Saldo User)',
  })
  async approveOrder(
    @Param('id') orderId: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.tokensService.approveOrder(orderId, adminNote);
  }

  @Patch('orders/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: Reject payment order (Tolak Pesanan Pembelian)',
  })
  async rejectOrder(
    @Param('id') orderId: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.tokensService.rejectOrder(orderId, adminNote);
  }
}
