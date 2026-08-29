ALTER TABLE "debt" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "debt_embedding_idx" ON "debt" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "decisions_embedding_idx" ON "decisions" USING hnsw ("embedding" vector_cosine_ops);