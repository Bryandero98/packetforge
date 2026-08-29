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
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run start:dev
```

You need a real Postgres with `pgvector` available — `docker compose up -d`
gives you one. No Docker? Point `DATABASE_URL` in `.env` at any Postgres
that has the `vector` extension installed.

## How we write tests

**No mocks on the database.** Every test that touches persistence in this
repo runs against a real Postgres — the same one `DATABASE_URL` points at,
migrated (`npm run db:migrate`), not a mocked query builder. A mock can't
tell you a foreign key constraint fired or that a migration produced the
shape your code expects; a real database can. These suites skip themselves
automatically when `DATABASE_URL` isn't set (`describeIfDb` at the top of
each one) — set it before running `npm test` to actually exercise them. See
`src/decision/decision.service.spec.ts` for the pattern: a real `pg` pool,
truncated and re-seeded in `beforeEach`, injected through Nest's testing
module.

`npm test` runs every suite against one shared database in-band (`--runInBand`)
on purpose — Jest's usual per-file parallelism would let two suites'
`TRUNCATE`s race against each other on that same live database.

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

Edit `src/database/schema.ts`, then generate the migration instead of
writing SQL by hand:

```bash
npm run db:generate
```

Never edit a migration file under `drizzle/` once it's committed and shipped
— add a new schema change and generate a new migration instead. This is
what lets an existing database upgrade itself (`npm run db:migrate`) instead
of breaking on whatever shape it was left in.
