import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesInfoModule } from './services-info/services-info.module';
import { TeacherExamsModule } from './teacher-exams/teacher-exams.module';
import { TokensModule } from './tokens/tokens.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GamesModule,
    TeacherExamsModule,
    TokensModule,
    ServicesInfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
