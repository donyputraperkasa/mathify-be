import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherExamAccessService } from './teacher-exam-access.service';

@Injectable()
export class TeacherExamMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherExamAccessService,
  ) {}

  async getParticipants(teacherId: string, examId: string) {
    await this.access.findOwnedExam(teacherId, examId);

    const participants = await this.prisma.teacherExamParticipant.findMany({
      where: { examId },
      select: {
        id: true,
        name: true,
        attendanceNumber: true,
        className: true,
        status: true,
        score: true,
        correctAnswers: true,
        wrongAnswers: true,
        unansweredQuestions: true,
        answeredQuestions: true,
        currentQuestionIndex: true,
        violationCount: true,
        lastActivityAt: true,
        startedAt: true,
        submittedAt: true,
        blockedAt: true,
        blockReason: true,
        answers: {
          select: { isCorrect: true, selectedOptionId: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    return participants.map(({ answers, ...participant }) => {
      if (participant.status === 'SUBMITTED') return participant;

      const answered = answers.filter((a) => a.selectedOptionId !== null);
      const correctAnswers = answered.filter((a) => a.isCorrect).length;

      return {
        ...participant,
        correctAnswers,
        wrongAnswers: answered.length - correctAnswers,
      };
    });
  }

  async getParticipantDetail(
    teacherId: string,
    examId: string,
    participantId: string,
  ) {
    await this.access.findOwnedExam(teacherId, examId);

    const participant = await this.prisma.teacherExamParticipant.findFirst({
      where: { id: participantId, examId },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!participant) {
      throw new NotFoundException('Peserta tidak ditemukan.');
    }

    return participant;
  }

  async unblockParticipant(
    teacherId: string,
    examId: string,
    participantId: string,
  ) {
    const exam = await this.access.findOwnedExam(teacherId, examId);
    if (exam.status !== 'PUBLISHED') {
      throw new BadRequestException('Ujian sudah tidak aktif.');
    }

    const participant = await this.prisma.teacherExamParticipant.findFirst({
      where: { id: participantId, examId },
    });
    if (!participant) {
      throw new NotFoundException('Peserta tidak ditemukan.');
    }
    if (participant.status !== 'BLOCKED') {
      throw new BadRequestException('Peserta ini tidak sedang diblokir.');
    }

    return this.prisma.teacherExamParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'IN_PROGRESS',
        blockedAt: null,
        blockReason: null,
        lastActivityAt: new Date(),
      },
    });
  }
}
