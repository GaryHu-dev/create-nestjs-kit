# create-nestjs-kit

[![npm version](https://img.shields.io/npm/v/create-nestjs-kit.svg)](https://www.npmjs.com/package/create-nestjs-kit)
[![CI](https://github.com/GaryHu-dev/create-nestjs-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/GaryHu-dev/create-nestjs-kit/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Start a new NestJS backend from
[nestjs-starter-kit](https://github.com/GaryHu-dev/nestjs-starter-kit) and skip
the usual first-day setup. One command gets you auth, RBAC, TypeORM, migrations
and Docker already wired together — plus a `.env` with real secrets and a fresh
git repo.

```bash
pnpm create nestjs-kit my-app
```

```text
┌  create-nestjs-kit
│
◇  Project name
│  my-app
│
◇  Fetching template…
│
◇  Initialising git repository…
│
◇  Install dependencies now (pnpm)?
│  Yes
│
◇  Start Docker (docker compose up -d)?
│  No
│
└  Next steps:
     cd my-app
     docker compose up -d
     pnpm migration:run
     pnpm seed
     pnpm start:dev
```

## Why

`nest new` hands you an empty app. Most teams then spend the first day or two
bolting on the same plumbing every time — authentication, refresh tokens, roles
and permissions, a database layer with migrations, Swagger, logging, Docker.

This skips that. You get an opinionated starting point with those pieces already
in place, and you delete what you don't need — which is quicker than adding what
you do.

## Usage

```bash
pnpm create nestjs-kit my-app        # into ./my-app
pnpm create nestjs-kit .             # into the current directory
npm create nestjs-kit@latest my-app  # npm is fine too — the project still uses pnpm
```

Run it with no name and it'll ask. Once the files are in place it asks whether
to install dependencies and start Docker; answer those up front with flags to
run it non-interactively.

### Options

| Flag | Description |
|------|-------------|
| `--install` / `--no-install` | Install dependencies (default: ask) |
| `--docker` / `--no-docker` | Run `docker compose up -d` (default: ask) |
| `--ref <branch\|tag\|sha>` | Template version to use (default: `main`) |
| `--yes` | Take the defaults: install yes, docker no |
| `--force` | Allow a non-empty target directory |

### Requirements

- Node 18+ to run the CLI.
- The generated project wants Node 22+ and pnpm.
- Docker is optional — only if you want the bundled Postgres via `docker compose`.

## What you get

The template underneath comes with:

- JWT auth with refresh tokens, and Google + GitHub OAuth
- Role- and permission-based access control (RBAC)
- TypeORM + PostgreSQL, with migrations and seeds
- Swagger docs, request validation, structured logging (pino)
- Health checks, rate limiting, Helmet, a `Dockerfile` and `docker-compose.yml`

Laid out like this:

```text
src/
  modules/     auth, users, roles, permissions, identities, health
  common/      filters, interceptors, pipes, logging, middleware
  config/      typed config + env validation
  database/    entities, migrations, seeds, data-source
  shared/      constants, enums, types, utils, validators
test/          end-to-end tests and helpers
```

## After scaffolding

```bash
cd my-app
pnpm install
docker compose up -d      # starts Postgres
pnpm migration:run        # apply the schema
pnpm seed                 # optional: seed initial data
pnpm start:dev
```

The API comes up on http://localhost:3000, Swagger on http://localhost:3000/docs.
Deeper docs (architecture, API, database, deployment) live in the generated
project's own `docs/` folder.

## How it works

The CLI pulls the template as a tarball straight from GitHub — no `git` needed
to fetch it. It drops the files that only belong to the template repo (`.github/`,
its `LICENSE`, contributing and release notes), rewrites `package.json`, writes a
`.env` with randomly generated secrets, and starts a fresh git history. If the
optional install or Docker step fails, it tells you and leaves the project
intact — it never rolls back what it already created.

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev
setup.

## License

MIT © Gary Hu
