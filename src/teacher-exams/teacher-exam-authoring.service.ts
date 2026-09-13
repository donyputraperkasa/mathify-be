import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeacherExam } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherExamDto } from './dto/create-teacher-exam.dto';
import { CreateTeacherQuestionDto } from './dto/create-teacher-question.dto';
import { ReplaceTeacherExamRosterDto } from './dto/replace-teacher-exam-roster.dto';
import { UpdateTeacherExamDto } from './dto/update-teacher-exam.dto';
import { TeacherExamAccessService } from './teacher-exam-access.service';
import {
  cleanParticipantValue,
  normalizeParticipantValue,
} from './teacher-exam-normalization';

@Injectable()
export class TeacherExamAuthoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherExamAccessService,
  ) {}

  async create(
    teacherId: string,
    dto: CreateTeacherExamDto,
  ): Promise<TeacherExam> {
    return this.prisma.teacherExam.create({
      data: {
        teacherId,
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        pin: dto.pin,
        shareToken: randomUUID(),
        autoBlockOnViolation: dto.autoBlockOnViolation ?? true,
        maxViolations: dto.maxViolations ?? 1,
        randomizeQuestions: dto.randomizeQuestions ?? false,
        randomizeOptions: dto.randomizeOptions ?? false,
        showScoreAfterSubmit: dto.showScoreAfterSubmit ?? true,
        showReviewAfterSubmit: dto.showReviewAfterSubmit ?? false,
      },
    });
  }

  async findAll(teacherId: string): Promise<TeacherExam[]> {
    return this.prisma.teacherExam.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: {
            questions: true,
            participants: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(teacherId: string, examId: string) {
    const exam = await this.prisma.teacherExam.findFirst({
      where: { id: examId, teacherId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' },
        },
        rosterEntries: {
          orderBy: [
            { normalizedClassName: 'asc' },
            { attendanceNumber: 'asc' },
          ],
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan.');
    }

    return exam;
  }

  async update(
    teacherId: string,
    examId: string,
    dto: UpdateTeacherExamDto,
  ): Promise<TeacherExam> {
    await this.access.ensureExamEditable(teacherId, examId);

    return this.prisma.teacherExam.update({
      where: { id: examId },
      data: {
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        pin: dto.pin,
        autoBlockOnViolation: dto.autoBlockOnViolation,
        maxViolations: dto.maxViolations,
        randomizeQuestions: dto.randomizeQuestions,
        randomizeOptions: dto.randomizeOptions,
        showScoreAfterSubmit: dto.showScoreAfterSubmit,
        showReviewAfterSubmit: dto.showReviewAfterSubmit,
      },
    });
  }

  async delete(
    teacherId: string,
    examId: string,
  ): Promise<{ message: string }> {
    const exam = await this.access.findOwnedExam(teacherId, examId);

    if (exam.status !== 'DRAFT') {
      throw new BadRequestException(
        'Hanya ujian berstatus draft yang dapat dihapus.',
      );
    }

    await this.prisma.teacherExam.delete({ where: { id: examId } });
    return { message: 'Ujian berhasil dihapus.' };
  }

  async addQuestion(
    teacherId: string,
    examId: string,
    dto: CreateTeacherQuestionDto,
  ) {
    await this.access.ensureExamEditable(teacherId, examId);
    this.ensureSingleCorrectOption(dto);

    const questionCount = await this.prisma.teacherExamQuestion.count({
      where: { examId },
    });

    return this.prisma.teacherExamQuestion.create({
      data: {
        examId,
        question: dto.question,
        imageUrl: dto.imageUrl,
        explanation: dto.explanation,
        order: questionCount + 1,
        options: { create: this.mapOptions(dto) },
      },
      include: { options: true },
    });
  }

  async updateQuestion(
    teacherId: string,
    examId: string,
    questionId: string,
    dto: CreateTeacherQuestionDto,
  ) {
    await this.access.ensureExamEditable(teacherId, examId);

    const question = await this.prisma.teacherExamQuestion.findFirst({
      where: { id: questionId, examId },
    });

    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    this.ensureSingleCorrectOption(dto);
    return this.prisma.teacherExamQuestion.update({
      where: { id: questionId },
      data: {
        question: dto.question,
        imageUrl: dto.imageUrl,
        explanation: dto.explanation,
        options: { deleteMany: {}, create: this.mapOptions(dto) },
      },
      include: { options: true },
    });
  }

  async deleteQuestion(
    teacherId: string,
    examId: string,
    questionId: string,
  ): Promise<{ message: string }> {
    await this.access.ensureExamEditable(teacherId, examId);

    const question = await this.prisma.teacherExamQuestion.findFirst({
      where: { id: questionId, examId },
    });
    if (!question) {
      throw new NotFoundException('Soal tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherExamQuestion.delete({ where: { id: questionId } });
      const remainingQuestions = await tx.teacherExamQuestion.findMany({
        where: { examId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      await Promise.all(
        remainingQuestions.map((item, index) =>
          tx.teacherExamQuestion.update({
            where: { id: item.id },
            data: { order: index + 1 },
          }),
        ),
      );
    });

    return { message: 'Soal berhasil dihapus.' };
  }

  async replaceRoster(
    teacherId: string,
    examId: string,
    dto: ReplaceTeacherExamRosterDto,
  ) {
    await this.access.ensureExamEditable(teacherId, examId);
    const students = dto.students.map((student) => {
      const attendanceNumber = cleanParticipantValue(student.attendanceNumber);
      const studentName = cleanParticipantValue(student.studentName);
      const className = cleanParticipantValue(student.className);
      return {
        examId,
        attendanceNumber,
        studentName,
        normalizedName: normalizeParticipantValue(studentName),
        className,
        normalizedClassName: normalizeParticipantValue(className),
      };
    });
    this.ensureUniqueRoster(students);

    return this.prisma.$transaction(async (tx) => {
      await tx.teacherExamRosterEntry.deleteMany({ where: { examId } });
      if (students.length) {
        await tx.teacherExamRosterEntry.createMany({ data: students });
      }
      return tx.teacherExamRosterEntry.findMany({
        where: { examId },
        orderBy: [{ normalizedClassName: 'asc' }, { attendanceNumber: 'asc' }],
      });
    });
  }

  async reuse(teacherId: string, examId: string): Promise<TeacherExam> {
    const exam = await this.prisma.teacherExam.findFirst({
      where: { id: examId, teacherId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' },
        },
        rosterEntries: {
          orderBy: [
            { normalizedClassName: 'asc' },
            { attendanceNumber: 'asc' },
          ],
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan.');
    }
    if (exam.status !== 'CLOSED') {
      throw new BadRequestException(
        'Ujian harus ditutup sebelum dapat digunakan lagi.',
      );
    }

    return this.prisma.teacherExam.create({
      data: {
        teacherId,
        title: `${exam.title} - Sesi Baru`,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        pin: exam.pin,
        shareToken: randomUUID(),
        autoBlockOnViolation: exam.autoBlockOnViolation,
        maxViolations: exam.maxViolations,
        randomizeQuestions: exam.randomizeQuestions,
        randomizeOptions: exam.randomizeOptions,
        showScoreAfterSubmit: exam.showScoreAfterSubmit,
        showReviewAfterSubmit: exam.showReviewAfterSubmit,
        questions: {
          create: exam.questions.map((question) => ({
            question: question.question,
            imageUrl: question.imageUrl,
            explanation: question.explanation,
            order: question.order,
            options: {
              create: question.options.map((option) => ({
                label: option.label,
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
        rosterEntries: {
          create: exam.rosterEntries.map((student) => ({
            attendanceNumber: student.attendanceNumber,
            studentName: student.studentName,
            normalizedName: student.normalizedName,
            className: student.className,
            normalizedClassName: student.normalizedClassName,
          })),
        },
      },
    });
  }

  private ensureSingleCorrectOption(dto: CreateTeacherQuestionDto): void {
    if (dto.options.filter((option) => option.isCorrect).length !== 1) {
      throw new BadRequestException(
        'Setiap soal harus memiliki tepat satu jawaban benar.',
      );
    }
  }

  private mapOptions(dto: CreateTeacherQuestionDto) {
    return dto.options.map((option) => ({
      label: option.label,
      text: option.text,
      isCorrect: option.isCorrect,
    }));
  }

  private ensureUniqueRoster(
    students: Array<{ attendanceNumber: string; normalizedClassName: string }>,
  ): void {
    const keys = students.map(
      (s) => `${s.normalizedClassName}::${s.attendanceNumber}`,
    );
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Nomor absen tidak boleh sama dalam kelas yang sama.',
      );
    }
  }
}
