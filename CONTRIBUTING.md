# Contributing to PacketForge

Thanks for looking at this. PacketForge is young and the rules below are
what keep it that way as more people touch it — short version: real tests,
clear commits, and CI green before anyone reviews your code.

## Before you start

For anything bigger than a typo fix, open an issue first (or comment on an
existing one) describing what you want to change and why. That avoids two
people solving the same problem, and catches a design disagreement before
you've written the code.

Good first issues are tagged
[`good first issue`](../../labels/good%20first%20issue); anything tagged
[`help wanted`](../../labels/help%20wanted) is scoped and ready to pick up.

## Setup

```bash
git clone <this-repo>
cd packetforge
npm install
npm run start:dev
```

You're running against a local SQLite file — nothing else to install or
configure.

## How we write tests

**No mocks on the database.** Every test in this repo runs against a real
SQLite database (`:memory:`, throwaway, created fresh per test). A mocked
query builder can't tell you a foreign key constraint fired or that a
migration produced the shape your code expects — a real database can, and
it costs nothing here since SQLite starts in milliseconds. See
`src/decision/decision.service.spec.ts` for the pattern: spin up an
in-memory database, run the real migrations against it, inject it through
Nest's testing module.

Run the suite with:

```bash
npm test
npm run lint
npm run build
```

All three need to pass before you open a PR.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), always:

```
<type>(<scope>): <summary>

<body, if the change needs explaining>
```

`type` is one of `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
`scope` is the module you touched (`graph`, `decision`, `debt`, `adapter`,
`database`). Reference the issue you're closing: `Fixes #12`.

## Opening a PR

1. Branch off `main`: `<type>/<short-description>`.
2. Keep it to one change. A second unrelated fix you noticed along the way
   is a separate PR.
3. Fill in what you actually ran (test output, not "should work").
4. Wait for CI to go green before pinging anyone for review — a red check
   with no explanation gets asked about, not reviewed.

## Adding a new adapter

If you're adding support for a new tool (an agent framework, a CLI, an
editor plugin), you almost certainly don't need to touch anything outside
`src/adapter/`:

1. Implement `PacketAdapter` (`src/adapter/adapter.interface.ts`) in a new
   file under `src/adapter/adapters/`.
2. Register it in `AdapterModule`'s `providers` and construct it in
   `AdapterService`, the same way `GenericJsonAdapter` is wired in.
3. Add a test that constructs your adapter directly and asserts on its
   `format()` output — see `adapter.service.spec.ts`.

## Changing the database schema

Never edit an existing entry in the `MIGRATIONS` array
(`src/database/migrations.ts`) once it's shipped. Add a new one with the
next version number, and bump `CURRENT_SCHEMA_VERSION` to match. This is
what lets an existing database upgrade itself automatically instead of
breaking on whatever shape it was left in.
