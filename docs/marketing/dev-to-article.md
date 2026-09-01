<!-- Draft for Dev.to / Hashnode. -->

# Your AI Agent Forgot Why It Did That. PacketForge Is the Fix.

## The pain

An AI coding agent burns through a task graph fast - ten tasks in an
afternoon isn't unusual anymore. Each one makes real decisions: "chose
Postgres over SQLite for the MVP," "left auth storing tokens in plaintext,
that's tracked debt," "picked this library because the other one had no
TypeScript types." None of that reasoning survives past the session that
produced it. It's not in the diff. It's not in a commit message anyone
reads later. The next session - or the next agent, or the next human -
starts from the code and has to re-derive *why*, or just guesses and
sometimes guesses wrong.

Code comments don't fix this. A comment sits in one file, read only by
whoever opens that exact file next. It doesn't get surfaced to a
*different* task that depends on the same decision, and it's invisible to
anything searching by meaning instead of by file path.

[PacketForge](https://github.com/Bryandero98/packetforge) is shared memory
for a task graph: a small, self-hosted API any agent, CLI, or editor
plugin can read from and write to, so "why did the last task do it this
way" has a real answer instead of a re-read-the-diff-and-guess.

## How it works

Every task gets two kinds of notes attached to it:

- **Decisions** - why it was built the way it was.
- **Debt** - what's still wrong with it, left for whatever depends on it.

Both get embedded (OpenAI's `text-embedding-3-small`, pluggable behind a
one-method `EmbeddingProvider` interface) so `GET /graph/search` finds them
by *meaning*, not literal text - search "how are cards modeled" and it
surfaces the decision that said "plain object, no behavior yet," not just
rows containing the word "model." Writing a near-duplicate decision on the
same task flags a conflict automatically (cosine similarity against
existing notes) - a warning, never a rejection, since the agent writing it
is in a better position to judge than a threshold is.

## What shipped this round

PacketForge started as an API-only MVP. This batch turned it into
something closer to real infrastructure:

**Multi-project.** One deployment now serves several repos instead of
needing one per project. `POST /projects`, then scope tasks with
`projectId` - omit it anywhere and everything still defaults to `"default"`,
so nothing existing breaks.

**A dashboard that didn't exist before.** `GET /dashboard` - a Kanban
board grouped by whatever status values are actually in use, a
click-through detail panel, a project filter, a live semantic search box.
One file, no build step, no framework - it just calls PacketForge's own
REST API like anything else would.

**MCP, and why there's no dedicated n8n node.** `POST /mcp` exposes every
read/write as a [Model Context Protocol](https://modelcontextprotocol.io)
tool. n8n ships a built-in MCP Client node that connects to any MCP server
with just a URL - so an n8n workflow can already read and write the graph
today, no PacketForge-specific integration required on either side.

**A Cursor adapter**, on top of the existing `generic-json` one -
`GET /graph/tasks/:id/packet?adapter=cursor` renders a task's decisions and
debt as the Markdown Cursor's own context mechanism expects, instead of a
JSON blob.

**Actual ops surface**: `GET /health` (real database check, not "the
process is running"), `GET /export` (the whole graph as one JSON document
- this data lives nowhere except the database, unlike code), and
structured JSON request logging with a correlatable request id.

## Quick tutorial

```sh
git clone https://github.com/Bryandero98/packetforge
cd packetforge
npm install
docker compose up -d      # Postgres 17 + pgvector, one container
cp .env.example .env
npm run db:migrate
npm run start:dev
```

```sh
# Create a task
curl -X POST localhost:3000/graph/tasks \
  -H 'Content-Type: application/json' \
  -d '{"id": "CARD-MODEL", "title": "Card domain model"}'

# Record why it was built a certain way
curl -X POST localhost:3000/decisions \
  -H 'Content-Type: application/json' \
  -d '{"taskId": "CARD-MODEL", "note": "Plain object, not a class - no behavior yet"}'

# Search by meaning, not literal text
curl 'localhost:3000/graph/search?q=data+model+for+cards&limit=5'
```

Then open `localhost:3000/dashboard` and watch the same data show up as a
board.

## Where it's headed

The extension points are deliberately small on purpose: a new output
format is one `PacketAdapter` class (see
[`src/adapter/adapters/cursor.adapter.ts`](https://github.com/Bryandero98/packetforge/blob/main/src/adapter/adapters/cursor.adapter.ts)
for the pattern), a new embedding model is one `EmbeddingProvider` class.
Open issues if you want to try one:
[good first issue](https://github.com/Bryandero98/packetforge/issues).

Repo (MIT): https://github.com/Bryandero98/packetforge
