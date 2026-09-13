import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TeacherExam, TeacherExamParticipant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherExamAccessService {
  constructor(private readonly prisma: PrismaService) {}

  hasUnlimitedCredits(role: Role): boolean {
    return role === Role.ADMIN;
  }

  async findOwnedExam(teacherId: string, examId: string): Promise<TeacherExam> {
    const exam = await this.prisma.teacherExam.findFirst({
      where: { id: examId, teacherId },
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan.');
    }

    return exam;
  }

  async ensureExamEditable(teacherId: string, examId: string) {
    const exam = await this.prisma.teacherExam.findFirst({
      where: { id: examId, teacherId },
      include: { _count: { select: { participants: true } } },
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan.');
    }

    const editable =
      exam.status === 'DRAFT' ||
      (exam.status === 'PUBLISHED' && exam._count.participants === 0);

    if (!editable) {
      throw new BadRequestException(
        'Ujian tidak dapat diubah setelah peserta pertama mulai mengerjakan.',
      );
    }

    return exam;
  }

  isAccessExpired(accessExpiresAt: Date | null): boolean {
    return Boolean(accessExpiresAt && accessExpiresAt <= new Date());
  }

  async closeExpiredExam(examId: string): Promise<void> {
    await this.prisma.teacherExam.updateMany({
      where: { id: examId, status: 'PUBLISHED' },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async findParticipant(
    participantToken: string,
  ): Promise<TeacherExamParticipant> {
    const participant = await this.prisma.teacherExamParticipant.findUnique({
      where: { participantToken },
    });

    if (!participant) {
      throw new NotFoundException('Peserta tidak ditemukan.');
    }

    return participant;
  }

  async findActiveParticipant(
    participantToken: string,
  ): Promise<TeacherExamParticipant> {
    const participant = await this.findParticipant(participantToken);

    if (participant.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Ujian sudah selesai atau peserta telah diblokir.',
      );
    }

    return participant;
  }
}
