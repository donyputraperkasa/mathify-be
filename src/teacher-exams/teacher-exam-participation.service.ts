import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TeacherExamParticipant } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherExamEventDto } from './dto/create-teacher-exam-event.dto';
import { JoinTeacherExamDto } from './dto/join-teacher-exam.dto';
import { SaveTeacherAnswerDto } from './dto/save-teacher-answer.dto';
import { TeacherExamAccessService } from './teacher-exam-access.service';
import {
  cleanParticipantValue,
  normalizeParticipantValue,
} from './teacher-exam-normalization';

@Injectable()
export class TeacherExamParticipationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherExamAccessService,
  ) {}

  async findPublicExam(shareToken: string) {
    const exam = await this.prisma.teacherExam.findUnique({
      where: { shareToken },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        status: true,
        accessExpiresAt: true,
        randomizeQuestions: true,
        randomizeOptions: true,
        showScoreAfterSubmit: true,
        showReviewAfterSubmit: true,
        teacher: { select: { name: true } },
        rosterEntries: {
          select: {
            attendanceNumber: true,
            studentName: true,
            className: true,
          },
        },
        _count: { select: { questions: true } },
      },
    });

    if (
      !exam ||
      exam.status !== 'PUBLISHED' ||
      this.access.isAccessExpired(exam.accessExpiresAt)
    ) {
      if (exam?.status === 'PUBLISHED') {
        await this.access.closeExpiredExam(exam.id);
      }
      throw new NotFoundException(
        'Ujian tidak ditemukan atau masa aktifnya telah berakhir.',
      );
    }

    return {
      ...exam,
      requiresRoster: exam.rosterEntries.length > 0,
    };
  }

  async join(
    shareToken: string,
    dto: JoinTeacherExamDto,
  ): Promise<TeacherExamParticipant> {
    const exam = await this.prisma.teacherExam.findUnique({
      where: { shareToken },
    });

    if (
      !exam ||
      exam.status !== 'PUBLISHED' ||
      this.access.isAccessExpired(exam.accessExpiresAt)
    ) {
      if (exam?.status === 'PUBLISHED') {
        await this.access.closeExpiredExam(exam.id);
      }
      throw new NotFoundException('Ujian tidak ditemukan atau sudah ditutup.');
    }

    if (exam.pin !== dto.pin.trim()) {
      throw new UnauthorizedException('PIN ujian tidak sesuai.');
    }

    const rosterCount = await this.prisma.teacherExamRosterEntry.count({
      where: { examId: exam.id },
    });

    const suppliedData = {
      attendanceNumber: dto.attendanceNumber
        ? cleanParticipantValue(dto.attendanceNumber)
        : undefined,
      name: cleanParticipantValue(dto.name),
      className: cleanParticipantValue(dto.className),
    };

    const participantData = rosterCount
      ? await this.getRosterParticipantData(exam.id, suppliedData)
      : suppliedData;

    const existing = await this.prisma.teacherExamParticipant.findFirst({
      where: {
        examId: exam.id,
        attendanceNumber: participantData.attendanceNumber,
        className: participantData.className,
      },
    });

    if (existing?.status === 'SUBMITTED') {
      throw new BadRequestException('Peserta ini sudah menyelesaikan ujian.');
    }
    if (existing) {
      return existing;
    }

    return this.prisma.teacherExamParticipant.create({
      data: {
        examId: exam.id,
        name: participantData.name,
        attendanceNumber: participantData.attendanceNumber,
        className: participantData.className,
        participantToken: randomUUID(),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }

  async saveAnswer(participantToken: string, dto: SaveTeacherAnswerDto) {
    const participant =
      await this.access.findActiveParticipant(participantToken);

    const question = await this.prisma.teacherExamQuestion.findFirst({
      where: { id: dto.questionId, examId: participant.examId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    const selectedOption = dto.selectedOptionId
      ? question.options.find((opt) => opt.id === dto.selectedOptionId)
      : undefined;

    if (dto.selectedOptionId && !selectedOption) {
      throw new BadRequestException(
        'Pilihan jawaban tidak valid untuk pertanyaan ini.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.teacherExamAnswer.findFirst({
        where: {
          participantId: participant.id,
          questionId: dto.questionId,
        },
      });

      const answer = existing
        ? await tx.teacherExamAnswer.update({
            where: { id: existing.id },
            data: {
              selectedOptionId: dto.selectedOptionId ?? null,
              isCorrect: selectedOption?.isCorrect ?? false,
            },
          })
        : await tx.teacherExamAnswer.create({
            data: {
              participantId: participant.id,
              questionId: dto.questionId,
              selectedOptionId: dto.selectedOptionId ?? null,
              isCorrect: selectedOption?.isCorrect ?? false,
            },
          });

      const answeredCount = await tx.teacherExamAnswer.count({
        where: {
          participantId: participant.id,
          selectedOptionId: { not: null },
        },
      });

      await tx.teacherExamParticipant.update({
        where: { id: participant.id },
        data: {
          answeredQuestions: answeredCount,
          currentQuestionIndex: question.order,
          lastActivityAt: new Date(),
        },
      });

      return answer;
    });
  }

  async submit(participantToken: string): Promise<TeacherExamParticipant> {
    const participant = await this.prisma.teacherExamParticipant.findUnique({
      where: { participantToken },
      include: {
        exam: {
          include: { questions: { select: { id: true } } },
        },
        answers: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Peserta tidak ditemukan.');
    }
    if (participant.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Ujian sudah dikumpulkan atau peserta telah diblokir.',
      );
    }

    const totalQuestions = participant.exam.questions.length;
    const answeredQuestions = participant.answers.filter(
      (a) => a.selectedOptionId !== null,
    ).length;
    const correctAnswers = participant.answers.filter(
      (a) => a.isCorrect,
    ).length;
    const wrongAnswers = answeredQuestions - correctAnswers;
    const unansweredQuestions = Math.max(totalQuestions - answeredQuestions, 0);
    const score = totalQuestions
      ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
      : 0;

    return this.prisma.teacherExamParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'SUBMITTED',
        score,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        answeredQuestions,
        submittedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }

  async recordEvent(
    participantToken: string,
    dto: CreateTeacherExamEventDto,
  ): Promise<TeacherExamParticipant> {
    const participant = await this.prisma.teacherExamParticipant.findUnique({
      where: { participantToken },
      include: { exam: true },
    });

    if (!participant) {
      throw new NotFoundException('Peserta tidak ditemukan.');
    }
    if (participant.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Peserta tidak dalam status aktif mengerjakan ujian.',
      );
    }

    const violationCount = participant.violationCount + 1;
    const shouldBlock =
      participant.exam.autoBlockOnViolation &&
      violationCount >= participant.exam.maxViolations;

    return this.prisma.$transaction(async (tx) => {
      await tx.teacherExamEvent.create({
        data: {
          participantId: participant.id,
          type: dto.type,
          detail: dto.detail,
          isBlocking: shouldBlock,
        },
      });

      return tx.teacherExamParticipant.update({
        where: { id: participant.id },
        data: {
          violationCount,
          lastActivityAt: new Date(),
          ...(shouldBlock
            ? {
                status: 'BLOCKED',
                blockedAt: new Date(),
                blockReason: `Pelanggaran anti-curang: ${dto.type}`,
              }
            : {}),
        },
      });
    });
  }

  async getStatus(participantToken: string) {
    const participant = await this.access.findParticipant(participantToken);

    return {
      status: participant.status,
      blockReason: participant.blockReason,
      violationCount: participant.violationCount,
      score: participant.score,
    };
  }

  private async getRosterParticipantData(
    examId: string,
    supplied: {
      attendanceNumber?: string;
      name: string;
      className: string;
    },
  ) {
    const rosterEntry = await this.prisma.teacherExamRosterEntry.findFirst({
      where: {
        examId,
        ...(supplied.attendanceNumber
          ? { attendanceNumber: supplied.attendanceNumber }
          : {}),
        normalizedClassName: normalizeParticipantValue(supplied.className),
      },
    });

    if (
      !rosterEntry ||
      rosterEntry.normalizedName !== normalizeParticipantValue(supplied.name)
    ) {
      throw new BadRequestException(
        'Data siswa tidak cocok dengan daftar absensi resmi guru.',
      );
    }

    return {
      attendanceNumber: rosterEntry.attendanceNumber,
      name: rosterEntry.studentName,
      className: rosterEntry.className,
    };
  }
}
