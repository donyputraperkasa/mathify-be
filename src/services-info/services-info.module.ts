import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServicesInfoController } from './services-info.controller';
import { ServicesInfoService } from './services-info.service';

@Module({
  imports: [ConfigModule],
  controllers: [ServicesInfoController],
  providers: [ServicesInfoService],
  exports: [ServicesInfoService],
})
export class ServicesInfoModule {}
