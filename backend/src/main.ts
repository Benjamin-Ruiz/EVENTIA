import 'reflect-metadata';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  mkdirSync(dirname(process.env.DB_FILE || 'data/eventia.sqlite'), { recursive: true });

  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.enableCors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades sin decorador
      forbidNonWhitelisted: true, // y rechaza la solicitud si llegan (p. ej. "rol" o "organizadorId")
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const doc = new DocumentBuilder()
    .setTitle('Eventia API')
    .setDescription('API de gestión de eventos e inscripciones con autenticación JWT y control de acceso por roles y propiedad.')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc), {
    jsonDocumentUrl: 'docs/openapi.json',
  });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  Logger.log(`Eventia en http://localhost:${port} · API docs en http://localhost:${port}/docs`, 'Bootstrap');
}
bootstrap();
