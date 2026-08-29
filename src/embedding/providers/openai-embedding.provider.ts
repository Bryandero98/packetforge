import { Injectable } from '@nestjs/common';
import { EMBEDDING_DIMENSIONS } from '../../database/schema';
import type { EmbeddingProvider } from '../embedding-provider.interface';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';

// Reference EmbeddingProvider implementation - plain fetch (Node 22+ has it
// natively), not the `openai` SDK, to avoid pulling in a whole client
// library for one HTTP call. The API key is read lazily, at call time, not
// at construction: PacketForge boots and serves everything else fine with
// no key configured - only an actual embed() call needs one, and fails
// clearly when it's missing rather than crashing app startup over a
// feature nobody may be using yet.
@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embed(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required to compute embeddings (see .env.example).',
      );
    }

    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, input: text }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI embeddings request failed (${response.status}): ${body}`,
      );
    }

    const payload = (await response.json()) as {
      data: { embedding: number[] }[];
    };
    return payload.data[0].embedding;
  }
}
