import { Global, Module } from '@nestjs/common';
import { OpenAiEmbeddingProvider } from './providers/openai-embedding.provider';

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

// Global, same as DatabaseModule - every module that writes or searches
// notes needs this, and it has no per-module configuration to justify
// importing it explicitly everywhere.
@Global()
@Module({
  providers: [
    { provide: EMBEDDING_PROVIDER, useClass: OpenAiEmbeddingProvider },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
