import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SqliteExceptionFilter } from './database/sqlite-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new SqliteExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
