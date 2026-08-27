# PLANNING.md

Scratch file — draft text for GitHub issues to open once this repo is
public. Not part of the shipped docs; delete or move to actual issues once
they're filed.

---

## Issue 1 — `good first issue`: Add a `PATCH /graph/tasks/:id` endpoint to update task status

`GraphService`/`GraphController` currently only support listing and
creating tasks (`src/graph/`). There's no way to change a task's `status`
(e.g. `pending` → `in_progress` → `done`) once it exists.

**What to do:**
- Add `updateTaskStatus(id, status)` to `GraphService`, using Drizzle's
  `.update(tasks).set({ status }).where(eq(tasks.id, id))`.
- Add a `PATCH /graph/tasks/:id` route to `GraphController` accepting
  `{ status }`.
- Return a 404 (`NotFoundException`) if the task doesn't exist — see
  `DecisionService.addDecision` for the existing pattern.
- Add a real-database test (no mocks) asserting the status actually
  changes and that updating a missing task throws.

Good entry point: touches one module, the pattern to follow already
exists twice in the codebase (`decision.service.ts`, `debt.service.ts`).

---

## Issue 2 — `good first issue`: Add a `DELETE /graph/tasks/:id` endpoint

Symmetric problem to Issue 1: no way to remove a task. Since `decisions`
and `debt` both declare `ON DELETE CASCADE` on `task_id`, deleting a task
should cleanly remove its attached notes too — that's worth asserting in
the test, not just assuming.

**What to do:**
- Add `deleteTask(id)` to `GraphService`.
- Add a `DELETE /graph/tasks/:id` route.
- Test: create a task, attach a decision and a piece of debt to it, delete
  the task, assert both the task and its notes are gone.

---

## Issue 3 — `help wanted`: PostgreSQL support alongside SQLite

Right now storage is hardcoded to `better-sqlite3` in
`src/database/database.module.ts`. Larger deployments will want Postgres.

**What to do:**
- Add `drizzle-orm/node-postgres` (or similar) as an optional driver.
- Pick the driver based on an environment variable (e.g.
  `PACKETFORGE_DB_DRIVER=sqlite|postgres`), defaulting to `sqlite` so the
  five-minute local setup in the README keeps working unmodified.
- `src/database/migrations.ts`'s migration bodies are raw SQL strings
  written against SQLite's dialect — these will need a Postgres-compatible
  path (either dialect-specific SQL per migration, or a schema-builder
  approach that works for both).
- This is a bigger, cross-cutting issue — good for a contributor who wants
  to go deeper than a single module. Discuss the driver-selection approach
  in the issue before writing code.

---

## Issue 4 — `good first issue`: A Cursor adapter

The only adapter that exists today is `generic-json`
(`src/adapter/adapters/generic-json.adapter.ts`) — pretty-printed JSON,
no tool-specific shape.

**What to do:**
- Add `src/adapter/adapters/cursor.adapter.ts` implementing `PacketAdapter`,
  formatting a packet as Markdown suited to Cursor's `.cursorrules` /
  context-injection conventions (a "why" section from decisions, a "known
  issues" section from debt).
- Register it in `AdapterModule` alongside `GenericJsonAdapter`.
- Add a test on `format()`'s output — see `adapter.service.spec.ts` for
  the shape of an adapter test.

Exact output format is a judgment call — say what you chose and why in
the PR description.

---

## Issue 5 — `good first issue`: `GET /graph/tasks/:id` (a single task, with its decisions and debt inline)

Today a client has to make three requests (one task, one decisions query,
one debt query) to see everything about a task. A single endpoint that
returns the task plus both attached note lists in one response would save
every consumer from re-implementing that join client-side.

**What to do:**
- Add `getTaskWithNotes(id)` to `GraphService`, composing the existing
  `DecisionService`/`DebtService` (inject them, don't duplicate their
  queries).
- Add a `GET /graph/tasks/:id` route returning
  `{ task, decisions, debt }`, 404 if the task doesn't exist.
- Test the composed shape directly against a real database with a task
  that has both a decision and a debt entry attached.
