import { Module } from '@nestjs/common';
import { TvSessionsController } from './tv-sessions.controller';
import { TvSessionsService } from './tv-sessions.service';

@Module({
  controllers: [TvSessionsController],
  providers: [TvSessionsService],
  exports: [TvSessionsService],
})
export class TvSessionsModule {}
