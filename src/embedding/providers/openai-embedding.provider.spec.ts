import { EMBEDDING_DIMENSIONS } from '../../database/schema';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

// Mocks fetch itself, not the provider - this is the one boundary that
// can't be exercised with a real API call in CI (no key, no network), so
// the contract with OpenAI's response shape is what's under test here:
// request payload, response parsing, and both failure modes. The
// success-path *content* (does the vector mean anything) is out of scope
// for a unit test - that needs a real key, see docs/epics/next-gen-features.md
// Phase 3.
describe('OpenAiEmbeddingProvider', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  let provider: OpenAiEmbeddingProvider;

  beforeEach(() => {
    provider = new OpenAiEmbeddingProvider();
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws a clear error when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(provider.embed('some text')).rejects.toThrow(
      'OPENAI_API_KEY is required',
    );
  });

  it('sends the configured model and text, and returns the parsed embedding', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const fakeEmbedding = new Array<number>(EMBEDDING_DIMENSIONS).fill(0.5);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: fakeEmbedding }] }),
    });
    global.fetch = fetchMock;

    const result = await provider.embed('Chose SQLite for the MVP storage');

    expect(result).toEqual(fakeEmbedding);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }) as unknown,
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'Chose SQLite for the MVP storage',
        }),
      }),
    );
  });

  it('throws with the status and body when OpenAI returns an error response', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"error":"invalid api key"}'),
    });

    await expect(provider.embed('text')).rejects.toThrow(
      /OpenAI embeddings request failed \(401\)/,
    );
  });
});
