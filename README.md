# PacketForge

PacketForge is a tool-agnostic context server for AI coding agents. It holds
a build graph — tasks, and two kinds of notes attached to them — and hands
that context to whatever agent or tool needs it, over a plain HTTP API.

Two notes travel with a task, for two different reasons:

- **Debt** — a known limitation a task leaves for whatever depends on it.
  "This works, but doesn't handle concurrent writes."
- **Decision** — why a task was built the way it was. "Chose SQLite over
  Postgres for the MVP: zero setup, good enough at this scale."

Neither is a code comment. A comment sits in one file and is read only by
whoever opens that file next. A debt or decision recorded through
PacketForge is queryable, attached to the task it belongs to, and surfaced
to every other task (and every other tool, and every other agent) that
depends on it — automatically, not by someone remembering to go read a
neighboring file.

## Why this exists

An AI agent working through a task graph makes decisions a later,
independent agent session has no way to see — it wasn't in that session's
context window, and it isn't in the diff. PacketForge is the shared memory
between those sessions: a small, self-hosted API that any agent, any CLI,
any editor plugin can read from and write to, so "why did the last task do
it this way" has an answer better than re-reading the diff and guessing.

## Quickstart

PacketForge stores its graph in Postgres, with [`pgvector`](https://github.com/pgvector/pgvector)
for semantic search. `docker-compose.yml` gets you both in one command:

```bash
git clone <this-repo>
cd packetforge
npm install
docker compose up -d          # Postgres 17 + pgvector, one container
cp .env.example .env          # DATABASE_URL already points at the compose db
npm run db:migrate            # applies every migration in drizzle/
npm run start:dev
```

The server starts on `http://localhost:3000`. No Docker? Point `DATABASE_URL`
in `.env` at any reachable Postgres with the `vector` extension available and
skip the `docker compose` step.

Semantic search (`GET /graph/search`) and computing embeddings on write need
an `OPENAI_API_KEY` in `.env` — everything else (tasks, decisions, debt,
adapters) works with no key configured. Without one, notes still save fine,
just without an embedding.

### Try it

```bash
# Create a task
curl -X POST localhost:3000/graph/tasks \
  -H 'Content-Type: application/json' \
  -d '{"id": "CARD-MODEL", "title": "Card domain model"}'

# Record why it was built a certain way
curl -X POST localhost:3000/decisions \
  -H 'Content-Type: application/json' \
  -d '{"taskId": "CARD-MODEL", "note": "Plain object, not a class - no behavior yet"}'

# Read it back
curl localhost:3000/decisions?taskId=CARD-MODEL

# Search by meaning, not literal text (needs OPENAI_API_KEY)
curl 'localhost:3000/graph/search?q=data+model+for+cards&limit=5'
```

## API

| Method | Path | Does |
|---|---|---|
| `GET` | `/graph/tasks` | List every task |
| `POST` | `/graph/tasks` | Create a task (`{ id, title }`) |
| `GET` | `/decisions?taskId=` | List decisions, optionally filtered to one task |
| `POST` | `/decisions` | Record a decision (`{ taskId, note }`) |
| `GET` | `/debt?taskId=` | List debt, optionally filtered to one task |
| `POST` | `/debt` | Record debt (`{ taskId, note }`) |
| `GET` | `/adapters` | List the registered output adapters |
| `GET` | `/graph/search?q=&limit=` | Semantic search over decisions and debt, ranked by cosine similarity, each result with its parent task inline |

## Architecture

```
src/
  database/   Postgres schema (Drizzle, drizzle-kit-managed migrations)
  graph/      tasks - the nodes the rest of the graph hangs off of
  decision/   why a task was built a certain way
  debt/       what's still wrong with a task
  adapter/    translates a packet into the shape a specific external tool expects
  embedding/  EmbeddingProvider interface + the OpenAI reference implementation
  search/     GET /graph/search - semantic search over decisions and debt
scripts/
  backfill-embeddings.ts   embeds any pre-existing note that predates the search feature
```

Storage is Postgres via [Drizzle ORM](https://orm.drizzle.team). Migrations
are generated, not hand-written: `npm run db:generate` diffs `src/database/schema.ts`
against `drizzle/` and writes the SQL; `npm run db:migrate` applies whatever
hasn't run yet. Nothing migrates automatically on boot — running migrations
is a separate, explicit step, so multiple app instances never race to alter
the same live schema on startup.

**Adapters** are the extension point for output format: a `PacketAdapter`
translates PacketForge's internal shape into whatever format a specific tool
expects (a CLI's stdout, an agent framework's system-prompt injection, a
webhook payload). Adding support for a new tool means writing one adapter —
see `src/adapter/adapters/generic-json.adapter.ts` for the reference
implementation — not touching the graph, decision, or debt modules.

**Embedding providers** are the equivalent extension point for search:
`EmbeddingProvider` (`src/embedding/embedding-provider.interface.ts`) is a
one-method interface (`embed(text) => number[]`), so swapping in a different
model or a local/self-hosted one means writing one class, not touching
`decision/`, `debt/`, or `search/`. A missing or failing provider never
blocks saving a note — the embedding is an enrichment on top of the note,
not a requirement for it — but it does mean that note won't show up in
search results until it has one. Notes written before search existed (or
saved while the provider was down) get one via:

```bash
npm run backfill:embeddings
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: real tests over
mocked ones, Conventional Commits, and every PR passing CI before review.

## License

[MIT](LICENSE)
