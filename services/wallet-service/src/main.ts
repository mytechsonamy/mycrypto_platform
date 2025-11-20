import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix is not needed as controllers define full paths
  // app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription('Wallet management service for cryptocurrency exchange - handles balances, deposits, withdrawals, and transaction history')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Wallet', 'Wallet balance operations')
    .addTag('Deposit', 'Deposit operations (TRY bank accounts and deposit requests)')
    .addTag('Withdrawal', 'Withdrawal operations (TRY and crypto)')
    .addTag('Ledger', 'Transaction history and ledger')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`Wallet service is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/health`);
}

bootstrap();
