import { Injectable } from '@nestjs/common';
import { EMBEDDING_DIMENSIONS } from '../../database/schema';
import type { EmbeddingProvider } from '../embedding-provider.interface';

const GEMINI_EMBEDDINGS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

// Reference EmbeddingProvider implementation for Google's Gemini API - same
// shape as OpenAiEmbeddingProvider (plain fetch, lazy key read). Gemini's
// embedding model natively outputs 3072-dim vectors but supports Matryoshka
// truncation via outputDimensionality, so it's asked for EMBEDDING_DIMENSIONS
// (1536) directly - matching the existing pgvector column with no schema
// change and no migration.
@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embed(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required to compute embeddings (see .env.example).',
      );
    }

    const response = await fetch(
      `${GEMINI_EMBEDDINGS_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini embeddings request failed (${response.status}): ${body}`,
      );
    }

    const payload = (await response.json()) as {
      embedding: { values: number[] };
    };
    return payload.embedding.values;
  }
}
