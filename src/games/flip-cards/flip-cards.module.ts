import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module';
import { FlipCardsController } from './flip-cards.controller';
import { FlipCardsService } from './flip-cards.service';

@Module({
  imports: [UsersModule],
  controllers: [FlipCardsController],
  providers: [FlipCardsService],
  exports: [FlipCardsService],
})
export class FlipCardsModule {}
