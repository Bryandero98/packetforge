// An EmbeddingProvider turns natural-language text into a vector - the same
// extension point shape as PacketAdapter (src/adapter/adapter.interface.ts):
// a minimal interface so PacketForge never ties its core (here, semantic
// search) to one specific embeddings API. Swapping providers means writing
// one class, not touching graph/decision/debt/search.
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}
