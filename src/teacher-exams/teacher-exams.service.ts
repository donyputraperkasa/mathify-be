import { Injectable } from '@nestjs/common';
import { Role, TeacherExam, TeacherExamParticipant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherExamEventDto } from './dto/create-teacher-exam-event.dto';
import { CreateTeacherExamDto } from './dto/create-teacher-exam.dto';
import { CreateTeacherQuestionDto } from './dto/create-teacher-question.dto';
import { JoinTeacherExamDto } from './dto/join-teacher-exam.dto';
import { ReplaceTeacherExamRosterDto } from './dto/replace-teacher-exam-roster.dto';
import { SaveTeacherAnswerDto } from './dto/save-teacher-answer.dto';
import { UpdateTeacherExamDto } from './dto/update-teacher-exam.dto';
import { TeacherExamAccessService } from './teacher-exam-access.service';
import { TeacherExamAuthoringService } from './teacher-exam-authoring.service';
import { TeacherExamMonitoringService } from './teacher-exam-monitoring.service';
import { TeacherExamParticipationService } from './teacher-exam-participation.service';
import { TeacherExamPublishingService } from './teacher-exam-publishing.service';

@Injectable()
export class TeacherExamsService {
  private readonly authoring: TeacherExamAuthoringService;
  private readonly publishing: TeacherExamPublishingService;
  private readonly participation: TeacherExamParticipationService;
  private readonly monitoring: TeacherExamMonitoringService;

  constructor(prisma: PrismaService) {
    const access = new TeacherExamAccessService(prisma);
    this.authoring = new TeacherExamAuthoringService(prisma, access);
    this.publishing = new TeacherExamPublishingService(prisma, access);
    this.participation = new TeacherExamParticipationService(prisma, access);
    this.monitoring = new TeacherExamMonitoringService(prisma, access);
  }

  createExam(
    teacherId: string,
    dto: CreateTeacherExamDto,
  ): Promise<TeacherExam> {
    return this.authoring.create(teacherId, dto);
  }

  findAllExams(teacherId: string): Promise<TeacherExam[]> {
    return this.authoring.findAll(teacherId);
  }

  findExamById(teacherId: string, examId: string) {
    return this.authoring.findById(teacherId, examId);
  }

  updateExam(
    teacherId: string,
    examId: string,
    dto: UpdateTeacherExamDto,
  ): Promise<TeacherExam> {
    return this.authoring.update(teacherId, examId, dto);
  }

  deleteExam(teacherId: string, examId: string): Promise<{ message: string }> {
    return this.authoring.delete(teacherId, examId);
  }

  addQuestion(
    teacherId: string,
    examId: string,
    dto: CreateTeacherQuestionDto,
  ) {
    return this.authoring.addQuestion(teacherId, examId, dto);
  }

  updateQuestion(
    teacherId: string,
    examId: string,
    questionId: string,
    dto: CreateTeacherQuestionDto,
  ) {
    return this.authoring.updateQuestion(teacherId, examId, questionId, dto);
  }

  deleteQuestion(teacherId: string, examId: string, questionId: string) {
    return this.authoring.deleteQuestion(teacherId, examId, questionId);
  }

  replaceRoster(
    teacherId: string,
    examId: string,
    dto: ReplaceTeacherExamRosterDto,
  ) {
    return this.authoring.replaceRoster(teacherId, examId, dto);
  }

  reuseExam(teacherId: string, examId: string): Promise<TeacherExam> {
    return this.authoring.reuse(teacherId, examId);
  }

  publishExam(
    teacherId: string,
    examId: string,
    role: Role,
  ): Promise<TeacherExam> {
    return this.publishing.publish(teacherId, examId, role);
  }

  closeExam(teacherId: string, examId: string): Promise<TeacherExam> {
    return this.publishing.close(teacherId, examId);
  }

  findPublicExam(shareToken: string) {
    return this.participation.findPublicExam(shareToken);
  }

  joinExam(
    shareToken: string,
    dto: JoinTeacherExamDto,
  ): Promise<TeacherExamParticipant> {
    return this.participation.join(shareToken, dto);
  }

  saveAnswer(participantToken: string, dto: SaveTeacherAnswerDto) {
    return this.participation.saveAnswer(participantToken, dto);
  }

  submitExam(participantToken: string): Promise<TeacherExamParticipant> {
    return this.participation.submit(participantToken);
  }

  recordEvent(
    participantToken: string,
    dto: CreateTeacherExamEventDto,
  ): Promise<TeacherExamParticipant> {
    return this.participation.recordEvent(participantToken, dto);
  }

  getParticipantStatus(participantToken: string) {
    return this.participation.getStatus(participantToken);
  }

  getParticipants(teacherId: string, examId: string) {
    return this.monitoring.getParticipants(teacherId, examId);
  }

  getParticipantDetail(
    teacherId: string,
    examId: string,
    participantId: string,
  ) {
    return this.monitoring.getParticipantDetail(
      teacherId,
      examId,
      participantId,
    );
  }

  unblockParticipant(teacherId: string, examId: string, participantId: string) {
    return this.monitoring.unblockParticipant(teacherId, examId, participantId);
  }
}
