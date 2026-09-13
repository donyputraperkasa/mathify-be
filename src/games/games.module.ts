import { Module } from '@nestjs/common';
import { FlipCardsModule } from './flip-cards/flip-cards.module';
import { TvSessionsModule } from './tv-sessions/tv-sessions.module';

@Module({
  imports: [FlipCardsModule, TvSessionsModule],
  exports: [FlipCardsModule, TvSessionsModule],
})
export class GamesModule {}
