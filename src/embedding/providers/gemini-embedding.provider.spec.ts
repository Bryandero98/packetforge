import { EMBEDDING_DIMENSIONS } from '../../database/schema';
import { GeminiEmbeddingProvider } from './gemini-embedding.provider';

// Mocks fetch itself, not the provider - this is the one boundary that
// can't be exercised with a real API call in CI (no key, no network), so
// the contract with Gemini's response shape is what's under test here:
// request payload, response parsing, and both failure modes. The
// success-path *content* (does the vector mean anything) is out of scope
// for a unit test - that needs a real key.
describe('GeminiEmbeddingProvider', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = global.fetch;
  let provider: GeminiEmbeddingProvider;

  beforeEach(() => {
    provider = new GeminiEmbeddingProvider();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws a clear error when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(provider.embed('some text')).rejects.toThrow(
      'GEMINI_API_KEY is required',
    );
  });

  it('sends the configured model, text, and truncated output dimensionality, and returns the parsed embedding', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const fakeEmbedding = new Array<number>(EMBEDDING_DIMENSIONS).fill(0.5);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: { values: fakeEmbedding } }),
    });
    global.fetch = fetchMock;

    const result = await provider.embed('Chose SQLite for the MVP storage');

    expect(result).toEqual(fakeEmbedding);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=test-key',
      ),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          content: { parts: [{ text: 'Chose SQLite for the MVP storage' }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }),
    );
  });

  it('throws with the status and body when Gemini returns an error response', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"error":"invalid api key"}'),
    });

    await expect(provider.embed('text')).rejects.toThrow(
      /Gemini embeddings request failed \(401\)/,
    );
  });
});
