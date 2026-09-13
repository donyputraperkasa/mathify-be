import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { ServicesInfoService } from './services-info.service';

@ApiTags('Services & WhatsApp Inquiries (Jasa Web & Les Matematika)')
@Controller('services-info')
export class ServicesInfoController {
  constructor(private readonly servicesInfoService: ServicesInfoService) {}

  @Get('links')
  @ApiOperation({
    summary:
      'Get direct WhatsApp chat links (Jasa Pembuatan Web & Les Matematika)',
  })
  @ApiResponse({
    status: 200,
    description: 'Direct WhatsApp links returned',
  })
  getDirectLinks() {
    return this.servicesInfoService.getDirectLinks();
  }

  @Post('inquire')
  @ApiOperation({
    summary:
      'Create consultation inquiry (Catat Konsultasi Klien & Buat Link WhatsApp)',
  })
  @ApiResponse({
    status: 201,
    description: 'Inquiry saved and WhatsApp link generated',
  })
  async createInquiry(
    @Body() dto: CreateInquiryDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.servicesInfoService.createInquiry(dto, {
      ipAddress,
      userAgent,
    });
  }

  @Get('leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: View all consultation leads (Daftar Calon Klien Masuk)',
  })
  async getLeads() {
    return this.servicesInfoService.getAllLeads();
  }
}
