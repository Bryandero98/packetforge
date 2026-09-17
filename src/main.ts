import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PgExceptionFilter } from './database/pg-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PgExceptionFilter());
  // Every @ApiProperty() on a request DTO documented a shape but never
  // enforced one - a wrong type or missing field passed straight through
  // to the service layer. `whitelist` strips unknown properties instead
  // of rejecting them (kept lenient - a caller sending one extra field
  // shouldn't 400), `transform` lets `@Type(() => Number)`-style coercion
  // and ParseIntPipe-adjacent behavior work on DTOs the same way path
  // params already do.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('PacketForge')
    .setDescription(
      'A tool-agnostic context server for AI coding agents: tasks, ' +
        'decisions, debt, and semantic search over both.',
    )
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
