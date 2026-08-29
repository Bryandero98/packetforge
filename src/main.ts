import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PgExceptionFilter } from './database/pg-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PgExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
