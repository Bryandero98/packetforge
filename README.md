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

```bash
git clone <this-repo>
cd packetforge
npm install
npm run start:dev
```

The server starts on `http://localhost:3000` and stores its data in a local
SQLite file (`packetforge.db` in the project root — override the path with
the `PACKETFORGE_DB_PATH` environment variable). The schema is created and
migrated automatically the first time it runs. That's the whole setup —
five minutes, no external database, no config file to write by hand.

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

## Architecture

```
src/
  database/   schema, versioned migrations, the Drizzle connection
  graph/      tasks - the nodes the rest of the graph hangs off of
  decision/   why a task was built a certain way
  debt/       what's still wrong with a task
  adapter/    translates a packet into the shape a specific external tool expects
```

Storage is SQLite via [Drizzle ORM](https://orm.drizzle.team), versioned
with SQLite's own `PRAGMA user_version` — every schema change is a numbered,
ordered migration in `src/database/migrations.ts`, applied automatically on
startup. A database from an older version of PacketForge upgrades itself
the moment you run a newer build against it.

**Adapters** are the extension point: a `PacketAdapter` translates
PacketForge's internal shape into whatever format a specific tool expects
(a CLI's stdout, an agent framework's system-prompt injection, a webhook
payload). Adding support for a new tool means writing one adapter — see
`src/adapter/adapters/generic-json.adapter.ts` for the reference
implementation — not touching the graph, decision, or debt modules.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: real tests over
mocked ones, Conventional Commits, and every PR passing CI before review.

## License

[MIT](LICENSE)
