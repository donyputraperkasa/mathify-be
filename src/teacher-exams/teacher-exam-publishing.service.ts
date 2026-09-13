import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TeacherExam } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherExamAccessService } from './teacher-exam-access.service';

@Injectable()
export class TeacherExamPublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherExamAccessService,
  ) {}

  async publish(
    teacherId: string,
    examId: string,
    role: Role,
  ): Promise<TeacherExam> {
    const exam = await this.prisma.teacherExam.findFirst({
      where: { id: examId, teacherId },
      include: { questions: { include: { options: true } } },
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan.');
    }
    if (exam.status === 'PUBLISHED') {
      return exam;
    }
    if (exam.status !== 'DRAFT') {
      throw new BadRequestException(
        'Hanya ujian berstatus draft yang dapat dipublikasikan.',
      );
    }
    if (!exam.questions.length) {
      throw new BadRequestException('Ujian belum memiliki soal.');
    }

    const invalidQuestion = exam.questions.find(
      (question) =>
        question.options.length < 2 ||
        question.options.filter((option) => option.isCorrect).length !== 1,
    );
    if (invalidQuestion) {
      throw new BadRequestException(
        'Masih ada soal yang belum memiliki minimal 2 opsi dan 1 kunci jawaban yang benar.',
      );
    }

    const publishedAt = new Date();
    const accessExpiresAt = new Date(publishedAt);
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: teacherId } });
      const unlimited = this.access.hasUnlimitedCredits(role);

      // Jika bukan admin dan user memiliki kredit ujian
      if (!unlimited && user && user.examCreditBalance > 0) {
        await tx.user.update({
          where: { id: teacherId },
          data: { examCreditBalance: { decrement: 1 } },
        });

        await tx.tokenTransaction.create({
          data: {
            userId: teacherId,
            productType: 'EXAM_CREDIT',
            amount: -1,
            type: 'CONSUME_EXAM',
            note: `Publikasi mode ujian: ${exam.title}`,
          },
        });
      }

      await tx.teacherExam.update({
        where: { id: examId },
        data: {
          status: 'PUBLISHED',
          publishedAt,
          accessExpiresAt,
          closedAt: null,
        },
      });

      return tx.teacherExam.findUniqueOrThrow({ where: { id: examId } });
    });
  }

  async close(teacherId: string, examId: string): Promise<TeacherExam> {
    const exam = await this.access.findOwnedExam(teacherId, examId);

    if (exam.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Hanya ujian yang sedang aktif/dipublikasikan yang dapat ditutup.',
      );
    }

    return this.prisma.teacherExam.update({
      where: { id: examId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
}
