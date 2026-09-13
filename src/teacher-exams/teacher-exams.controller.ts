import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { CreateTeacherExamEventDto } from './dto/create-teacher-exam-event.dto';
import { CreateTeacherExamDto } from './dto/create-teacher-exam.dto';
import { CreateTeacherQuestionDto } from './dto/create-teacher-question.dto';
import { JoinTeacherExamDto } from './dto/join-teacher-exam.dto';
import { ReplaceTeacherExamRosterDto } from './dto/replace-teacher-exam-roster.dto';
import { SaveTeacherAnswerDto } from './dto/save-teacher-answer.dto';
import { UpdateTeacherExamDto } from './dto/update-teacher-exam.dto';
import { TeacherExamsService } from './teacher-exams.service';

@ApiTags('Exam Mode (Mode Ujian Guru & Anti-Curang)')
@Controller('teacher-exams')
export class TeacherExamsController {
  constructor(private readonly teacherExamsService: TeacherExamsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new exam package (Draf)' })
  @ApiResponse({
    status: 201,
    description: 'Exam package created successfully',
  })
  createExam(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTeacherExamDto,
  ) {
    return this.teacherExamsService.createExam(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all exam packages (Daftar Ujian Milik Guru)' })
  findAllExams(@CurrentUser('sub') userId: string) {
    return this.teacherExamsService.findAllExams(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Get(':examId')
  @ApiOperation({
    summary: 'Get exam details (Detail Soal, Pengaturan & Peserta)',
  })
  findExamById(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.findExamById(userId, examId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Patch(':examId')
  @ApiOperation({
    summary: 'Update exam configuration (Pengaturan Ujian & Anti-Curang)',
  })
  updateExam(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Body() dto: UpdateTeacherExamDto,
  ) {
    return this.teacherExamsService.updateExam(userId, examId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Delete(':examId')
  @ApiOperation({
    summary: 'Delete an exam package (Hanya Jika Berstatus Draf)',
  })
  deleteExam(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.deleteExam(userId, examId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Post(':examId/questions')
  @ApiOperation({
    summary: 'Add a question to exam (Tambah Butir Soal Pilihan Ganda)',
  })
  addQuestion(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Body() dto: CreateTeacherQuestionDto,
  ) {
    return this.teacherExamsService.addQuestion(userId, examId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Patch(':examId/questions/:questionId')
  @ApiOperation({
    summary: 'Update question (Edit Butir Soal & Pilihan Jawaban)',
  })
  updateQuestion(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Body() dto: CreateTeacherQuestionDto,
  ) {
    return this.teacherExamsService.updateQuestion(
      userId,
      examId,
      questionId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Delete(':examId/questions/:questionId')
  @ApiOperation({ summary: 'Delete question (Hapus Butir Soal)' })
  deleteQuestion(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.teacherExamsService.deleteQuestion(userId, examId, questionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Put(':examId/roster')
  @ApiOperation({
    summary: 'Upload attendance roster (Daftar Absensi Resmi Siswa)',
  })
  replaceRoster(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Body() dto: ReplaceTeacherExamRosterDto,
  ) {
    return this.teacherExamsService.replaceRoster(userId, examId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Patch(':examId/publish')
  @ApiOperation({
    summary:
      'Publish exam for students with PIN (Pakai 1 Kredit Ujian Rp 14.900)',
  })
  publishExam(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.publishExam(userId, examId, userRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Patch(':examId/close')
  @ApiOperation({ summary: 'Close an ongoing exam session (Tutup Ujian)' })
  closeExam(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.closeExam(userId, examId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Post(':examId/reuse')
  @ApiOperation({
    summary:
      'Create a new exam session from finished exam (Gunakan Kembali Soal Ujian Lama)',
  })
  reuseExam(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.reuseExam(userId, examId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Get(':examId/participants')
  @ApiOperation({
    summary:
      'Monitor participants in real-time (Pantau Progres Siswa & Nilai Secara Langsung)',
  })
  getParticipants(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
  ) {
    return this.teacherExamsService.getParticipants(userId, examId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Get(':examId/participants/:participantId')
  @ApiOperation({
    summary: 'View student answer details (Riwayat Jawaban & Log Anti-Curang)',
  })
  getParticipantDetail(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.teacherExamsService.getParticipantDetail(
      userId,
      examId,
      participantId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @Patch(':examId/participants/:participantId/unblock')
  @ApiOperation({
    summary: 'Unblock a student (Buka Blokir Siswa Terkena Auto-Block)',
  })
  unblockParticipant(
    @CurrentUser('sub') userId: string,
    @Param('examId') examId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.teacherExamsService.unblockParticipant(
      userId,
      examId,
      participantId,
    );
  }

  // -------------------------------------------------------------
  // STUDENT PUBLIC PARTICIPATION ENDPOINTS
  // -------------------------------------------------------------

  @Get('public/:shareToken')
  @ApiOperation({
    summary: 'Check public exam info via share token link (Siswa)',
  })
  findPublicExam(@Param('shareToken') shareToken: string) {
    return this.teacherExamsService.findPublicExam(shareToken);
  }

  @Post('public/:shareToken/join')
  @ApiOperation({
    summary: 'Join exam by entering PIN and name (Masuk Ujian Siswa)',
  })
  joinExam(
    @Param('shareToken') shareToken: string,
    @Body() dto: JoinTeacherExamDto,
  ) {
    return this.teacherExamsService.joinExam(shareToken, dto);
  }

  @Post('participants/:participantToken/answers')
  @ApiOperation({ summary: 'Save student answer (Simpan Jawaban Butir Soal)' })
  saveAnswer(
    @Param('participantToken') participantToken: string,
    @Body() dto: SaveTeacherAnswerDto,
  ) {
    return this.teacherExamsService.saveAnswer(participantToken, dto);
  }

  @Post('participants/:participantToken/events')
  @ApiOperation({
    summary:
      'Log anti-cheat event (Catat Pelanggaran Pindah Tab, Blur, Exit Fullscreen)',
  })
  recordEvent(
    @Param('participantToken') participantToken: string,
    @Body() dto: CreateTeacherExamEventDto,
  ) {
    return this.teacherExamsService.recordEvent(participantToken, dto);
  }

  @Get('participants/:participantToken/status')
  @ApiOperation({
    summary:
      'Check student exam status (Status Pengerjaan Siswa: Mengerjakan, Diblokir, Selesai)',
  })
  getParticipantStatus(@Param('participantToken') participantToken: string) {
    return this.teacherExamsService.getParticipantStatus(participantToken);
  }

  @Post('participants/:participantToken/submit')
  @ApiOperation({
    summary:
      'Finalize and submit exam (Kumpulkan Ujian & Hitung Nilai Otomatis)',
  })
  submitExam(@Param('participantToken') participantToken: string) {
    return this.teacherExamsService.submitExam(participantToken);
  }
}
