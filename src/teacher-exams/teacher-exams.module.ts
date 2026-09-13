import { Module } from '@nestjs/common';
import { TeacherExamsController } from './teacher-exams.controller';
import { TeacherExamsService } from './teacher-exams.service';

@Module({
  controllers: [TeacherExamsController],
  providers: [TeacherExamsService],
  exports: [TeacherExamsService],
})
export class TeacherExamsModule {}
