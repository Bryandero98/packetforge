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
| `GET` | `/graph/tasks?projectId=` | List tasks, optionally scoped to one project |
| `POST` | `/graph/tasks` | Create a task (`{ id, title, projectId? }` - `projectId` defaults to `"default"`) |
| `GET` | `/graph/tasks/:id` | Read one task with every decision and debt note already attached |
| `PATCH` | `/graph/tasks/:id` | Update a task's status (`{ status }`) |
| `DELETE` | `/graph/tasks/:id` | Delete a task - its decisions and debt cascade with it |
| `GET` | `/graph/tasks/:id/packet?adapter=` | A task's full context, formatted by a registered adapter (default `generic-json`) |
| `GET` | `/decisions?taskId=` | List decisions, optionally filtered to one task |
| `POST` | `/decisions` | Record a decision (`{ taskId, note }`) |
| `GET` | `/debt?taskId=` | List debt, optionally filtered to one task |
| `POST` | `/debt` | Record debt (`{ taskId, note }`) |
| `GET` | `/adapters` | List the registered output adapters (`generic-json`, `cursor`) |
| `GET` | `/graph/search?q=&limit=&projectId=` | Semantic search over decisions and debt, ranked by cosine similarity, each result with its parent task inline |
| `GET` | `/projects` | List every project - a `"default"` project always exists |
| `POST` | `/projects` | Create a project (`{ id, name }`) |
| `GET` | `/health` | Database connectivity + embedding provider config - `503` if the database is unreachable |
| `GET` | `/export` | The entire graph (every task, decision, debt note, embeddings included) as one JSON document |
| `GET` | `/dashboard` | A visual Kanban board + task detail + search UI - see below |
| `POST` | `/mcp` | [Model Context Protocol](https://modelcontextprotocol.io) server - every operation above, minus `/adapters`, as an MCP tool |

## Dashboard

`GET /dashboard` is a single self-contained page (no build step, no framework, no external dependencies) - a Kanban board grouped by whatever status values actually exist, a click-through detail panel for each task's decisions and debt, a project filter, and a semantic search box. It's the one part of PacketForge meant to be opened directly in a browser by a human; everything else in this README is meant for a tool or an agent. Open `http://localhost:3000/dashboard` once the server is running.

## n8n

PacketForge doesn't ship a dedicated n8n node - it doesn't need one yet. n8n's built-in **MCP Client node** connects to any MCP server with just a URL, and `/mcp` above already exposes every write/read operation as an MCP tool, so an n8n workflow can read and write the graph today with zero extra code on either side.

## Architecture

```
src/
  database/   Postgres schema (Drizzle, drizzle-kit-managed migrations)
  projects/   workspace scoping - one deployment can serve several projects
  graph/      tasks - the nodes the rest of the graph hangs off of
  decision/   why a task was built a certain way
  debt/       what's still wrong with a task
  adapter/    translates a packet into the shape a specific external tool expects
  embedding/  EmbeddingProvider interface + the OpenAI reference implementation
  search/     GET /graph/search - semantic search over decisions and debt
  mcp/        POST /mcp - the same operations above as Model Context Protocol tools
  health/     GET /health - database connectivity + embedding provider config
  export/     GET /export - the entire graph as one JSON document
  dashboard/  GET /dashboard - the visual Kanban/detail/search UI
  logging/    structured JSON request logging, one line per request
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

## Support this project

PacketForge is free and will stay free. If it's saving your agents from re-deriving context they already lost once, a small tip helps keep it going:

- **Ko-fi:** [ko-fi.com/bryandero98](https://ko-fi.com/bryandero98)
- **USDT (TRC20):** `TEG4Kk2qXYMQ4mHNd7dPhSPRyT14CGr2or` — double-check the network is set to **TRC20** before sending; a transfer on the wrong network can't be recovered.

## License

[MIT](LICENSE)
