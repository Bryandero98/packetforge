import { Logger } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding-provider.interface';

const logger = new Logger('EmbeddingProvider');

// Embedding is an enrichment on a decision/debt note, never a requirement -
// the note itself is the data that matters, and a missing or failing
// embeddings provider (no API key configured, a network blip, rate
// limiting) must never block saving it. Returns null on any failure,
// logged so the gap is visible without surfacing to the API caller.
export async function embedSafely(
  provider: EmbeddingProvider,
  text: string,
): Promise<number[] | null> {
  try {
    return await provider.embed(text);
  } catch (error) {
    logger.warn(
      `embedding via "${provider.name}" failed, saving without one: ${String(error)}`,
    );
    return null;
  }
}
