import { Injectable } from '@nestjs/common';
import { EMBEDDING_DIMENSIONS } from '../../database/schema';
import type { EmbeddingProvider } from '../embedding-provider.interface';
import { RateLimiter } from '../rate-limiter';

const GEMINI_EMBEDDINGS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

// Google's free tier caps embedding calls at roughly 15-100 requests per
// minute (the exact figure isn't published precisely) - 12/min stays under
// even the conservative end, so a burst of writes (an agent logging many
// decisions back-to-back) gets spaced out instead of tripping a 429.
const RPM_LIMIT = 12;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

// Reference EmbeddingProvider implementation for Google's Gemini API - same
// shape as the OpenAI reference implementation this replaced (plain fetch,
// lazy key read). Gemini's embedding model natively outputs 3072-dim
// vectors but supports Matryoshka truncation via outputDimensionality, so
// it's asked for EMBEDDING_DIMENSIONS (1536) directly - matching the
// existing pgvector column with no schema change and no migration.
@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private readonly rateLimiter = new RateLimiter(60_000 / RPM_LIMIT);

  async embed(text: string): Promise<number[]> {
    return this.rateLimiter.schedule(() => this.embedWithRetry(text, 0));
  }

  private async embedWithRetry(
    text: string,
    attempt: number,
  ): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required to compute embeddings (see .env.example).',
      );
    }

    const response = await fetch(`${GEMINI_EMBEDDINGS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.embedWithRetry(text, attempt + 1);
    }

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
