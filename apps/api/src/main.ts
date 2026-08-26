import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('EventBlastAPI');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Keep disabled for Swagger & preview resources
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret'],
  });

  // Global Prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Static Uploads Directory
  const uploadDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('EventBlast WhatsApp Event Marketing Platform API')
    .setDescription(
      'Production-grade multi-tenant REST API for WhatsApp event invitations, RSVPs, contact imports, and analytics via OpenWA',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'EventBlast API Documentation',
  });

  await app.listen(port);
  logger.log(`🚀 EventBlast API server running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
  logger.log(`🩺 Health probe available at: http://localhost:${port}/health`);
}

bootstrap();
