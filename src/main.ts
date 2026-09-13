import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Railway/Proxy meneruskan protokol publik melalui X-Forwarded-Proto.
  // Ini memastikan URL upload yang dikembalikan API tetap memakai HTTPS.
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', 1);

  const port = process.env.PORT ?? 4000;
  const configuredOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = [
    ...new Set([
      ...configuredOrigins,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]),
  ];

  // Vercel dan frontend lokal dapat memakai API yang sama saat development/testing.
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // DTO menjadi kontrak API: field asing ditolak dan query string diubah
  // ke tipe DTO sebelum masuk ke controller/service.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger tersedia di /api/docs dan memakai bearer token untuk endpoint privat.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Satelyd API')
    .setDescription('learn . play . build')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: (
        operationA: { get: (key: string) => string },
        operationB: { get: (key: string) => string },
      ) => {
        const methodOrder: Record<string, number> = {
          post: 1,
          get: 2,
          patch: 3,
          delete: 4,
        };

        const methodA = operationA.get('method').toLowerCase();
        const methodB = operationB.get('method').toLowerCase();

        return (methodOrder[methodA] ?? 99) - (methodOrder[methodB] ?? 99);
      },
    },
  });

  await app.listen(port);

  // Ringkasan informatif console saat aplikasi berjalan.
  console.clear();
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
  console.log('\x1b[32m%s\x1b[0m', ' Satelyd Backend is Running');
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
  console.log(` Server URL   : http://localhost:${port}`);
  console.log(` Swagger API  : http://localhost:${port}/api/docs`);
  console.log(` Environment  : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(' Developed by : dony putra perkasa (owner)');
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
}

// Gagal saat bootstrap harus menghentikan proses agar deployment tidak terlihat sehat semu.
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

// Error di luar lifecycle request tidak boleh dibiarkan menghasilkan state parsial.
process.on('uncaughtException', (error: unknown) => {
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error: unknown) => {
  console.error(error);
  process.exit(1);
});
