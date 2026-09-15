import { Module } from '@nestjs/common';
import { GameDecksModule } from './game-decks/game-decks.module';
import { TvSessionsModule } from './tv-sessions/tv-sessions.module';

@Module({
  imports: [GameDecksModule, TvSessionsModule],
  exports: [GameDecksModule, TvSessionsModule],
})
export class GamesModule {}
