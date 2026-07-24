import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function corsOrigins(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw || raw === '*') {
    // Dev-friendly default; production should set explicit origins.
    if (process.env.NODE_ENV === 'production') {
      console.warn('CORS_ORIGINS is unset in production; defaulting to reflect request origin');
    }
    return true;
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production') {
      throw new Error('JWT_SECRET must be set to a strong secret in production');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production');
    }
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend server running on http://localhost:${port}`);
}

bootstrap();
