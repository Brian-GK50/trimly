import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { forward } from '@ngrok/ngrok';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 5000);
  if (
    process.env.NGROK_ENABLED
    && !['true', 'false'].includes(process.env.NGROK_ENABLED)
  ) {
    throw new Error('NGROK_ENABLED must be true or false');
  }
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
  app.enableShutdownHooks();
  await app.listen(port);

  if (process.env.NGROK_ENABLED === 'true') {
    const authToken = process.env.NGROK_AUTHTOKEN;
    const callbackToken = process.env.MPESA_CALLBACK_TOKEN;
    if (!authToken || !callbackToken) {
      throw new Error(
        'NGROK_AUTHTOKEN and MPESA_CALLBACK_TOKEN are required when NGROK_ENABLED=true',
      );
    }

    const listener = await forward({
      addr: port,
      authtoken: authToken,
      ...(process.env.NGROK_DOMAIN
        ? { domain: process.env.NGROK_DOMAIN }
        : {}),
    });
    const publicUrl = listener.url();
    if (!publicUrl) {
      await listener.close();
      throw new Error('ngrok did not return a public URL');
    }

    process.env.MPESA_CALLBACK_URL =
      `${publicUrl}/payments/mpesa/callback?token=${encodeURIComponent(callbackToken)}`;
    logger.log(`ngrok tunnel enabled at ${publicUrl}`);

    const closeTunnel = () => {
      void listener.close().catch((error: unknown) => {
        logger.error(
          'Unable to close ngrok tunnel',
          error instanceof Error ? error.stack : String(error),
        );
      });
    };
    process.once('SIGINT', closeTunnel);
    process.once('SIGTERM', closeTunnel);
  }
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Unable to start the Trimly API',
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});