# create-nestjs-kit

[![npm version](https://img.shields.io/npm/v/create-nestjs-kit.svg)](https://www.npmjs.com/package/create-nestjs-kit)
[![CI](https://github.com/GaryHu-dev/create-nestjs-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/GaryHu-dev/create-nestjs-kit/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Scaffold a new project from
[nestjs-starter-kit](https://github.com/GaryHu-dev/nestjs-starter-kit) — a
production-ready NestJS backend with auth, RBAC, TypeORM and Docker already
wired up.

```bash
pnpm create nestjs-kit my-app
```

That downloads the template, sets your project name, generates a `.env` with
fresh JWT secrets, and gives you a clean git repository to start from.

## Usage

```bash
pnpm create nestjs-kit my-app        # scaffold into ./my-app
pnpm create nestjs-kit .             # scaffold into the current directory
npm create nestjs-kit@latest my-app  # npm works too (still a pnpm project)
```

If you omit the name you'll be prompted for it. After the files are in place
you're asked whether to install dependencies and start Docker; both can be
answered up front with flags.

### Options

| Flag | Description |
|------|-------------|
| `--install` / `--no-install` | Install dependencies (default: ask) |
| `--docker` / `--no-docker` | Run `docker compose up -d` (default: ask) |
| `--ref <branch\|tag\|sha>` | Template version to use (default: `main`) |
| `--yes` | Accept defaults: install yes, docker no |
| `--force` | Allow a non-empty target directory |

### Requirements

- Node 18+ to run the CLI.
- The generated project needs Node 22+ and pnpm.
- Docker (optional) if you want a local Postgres via `docker compose`.

## What you get

The template it scaffolds ships with:

- JWT authentication with refresh tokens, plus Google and GitHub OAuth
- Role- and permission-based access control (RBAC)
- TypeORM + PostgreSQL, migrations and seeds
- Swagger docs, request validation, structured logging (pino)
- Health checks, rate limiting, Helmet, a Dockerfile and `docker-compose.yml`

## After scaffolding

```bash
cd my-app
pnpm install
docker compose up -d      # starts Postgres
pnpm migration:run        # apply the schema
pnpm seed                 # optional: seed initial data
pnpm start:dev
```

The API runs on http://localhost:3000, Swagger on http://localhost:3000/docs.
The scaffolded project's own `docs/` folder covers architecture, the API, the
database and deployment.

## How it works

The CLI fetches the template as a tarball from GitHub (no `git` required),
drops files that only belong to the template repo (`.github/`, its `LICENSE`,
contributing/release notes), rewrites `package.json`, writes a `.env` with
randomly generated secrets, and initialises a fresh git history. A failed
install or Docker step is reported but never rolls back your project.

## License

MIT
