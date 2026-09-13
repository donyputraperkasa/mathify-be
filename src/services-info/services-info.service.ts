import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class ServicesInfoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getPhoneNumber(): string {
    const raw =
      this.configService.get<string>('WHATSAPP_PHONE') ?? '6281234567890';
    return raw.replace(/[^0-9]/g, '');
  }

  generateWaLink(
    serviceType: ServiceType,
    visitorName?: string,
    notes?: string,
  ): string {
    const phone = this.getPhoneNumber();
    let defaultMsg = '';

    if (serviceType === 'WEB_DEVELOPMENT') {
      defaultMsg = `Halo Kak Dony, saya tertarik dengan layanan *Jasa Pembuatan Website* Satelyd.${visitorName ? ` Nama saya: ${visitorName}.` : ''}${notes ? ` Catatan: ${notes}` : ''}`;
    } else {
      defaultMsg = `Halo Kak Dony, saya ingin konsultasi mengenai *Jasa Les Privat Matematika* Satelyd.${visitorName ? ` Nama saya: ${visitorName}.` : ''}${notes ? ` Kebutuhan: ${notes}` : ''}`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(defaultMsg)}`;
  }

  async createInquiry(
    dto: CreateInquiryDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const waUrl = this.generateWaLink(
      dto.serviceType,
      dto.visitorName,
      dto.notes,
    );

    const lead = await this.prisma.serviceInquiry.create({
      data: {
        serviceType: dto.serviceType,
        visitorName: dto.visitorName,
        visitorPhone: dto.visitorPhone,
        notes: dto.notes,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        redirectedToWa: true,
      },
    });

    return {
      message: 'Inquiry berhasil dicatat, silakan lanjutkan ke WhatsApp',
      whatsappUrl: waUrl,
      leadId: lead.id,
    };
  }

  getDirectLinks() {
    return {
      webDevelopment: {
        service: 'Jasa Pembuatan Website',
        whatsappUrl: this.generateWaLink('WEB_DEVELOPMENT'),
      },
      mathTutoring: {
        service: 'Jasa Les Privat Matematika',
        whatsappUrl: this.generateWaLink('MATH_TUTORING'),
      },
    };
  }

  async getAllLeads() {
    return this.prisma.serviceInquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
