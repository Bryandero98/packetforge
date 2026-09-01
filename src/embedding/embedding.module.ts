import { Global, Module } from '@nestjs/common';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

// Global, same as DatabaseModule - every module that writes or searches
// notes needs this, and it has no per-module configuration to justify
// importing it explicitly everywhere.
@Global()
@Module({
  providers: [
    { provide: EMBEDDING_PROVIDER, useClass: GeminiEmbeddingProvider },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
