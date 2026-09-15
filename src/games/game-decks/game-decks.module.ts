import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module';
import { GameDecksController } from './game-decks.controller';
import { GameDecksService } from './game-decks.service';

@Module({
  imports: [UsersModule],
  controllers: [GameDecksController],
  providers: [GameDecksService],
  exports: [GameDecksService],
})
export class GameDecksModule {}
