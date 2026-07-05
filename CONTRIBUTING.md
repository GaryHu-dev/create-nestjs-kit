# Contributing

Thanks for taking the time to contribute.

## Development setup

Requires Node 22+ and pnpm for development (the pinned pnpm toolchain needs
Node 22.13+). The published CLI itself runs on Node 18+.

```bash
pnpm install
pnpm test        # run the test suite (vitest)
pnpm typecheck   # tsc --noEmit
pnpm build       # bundle to dist/ with tsup
```

## Running the CLI locally

```bash
pnpm build
node dist/index.js my-app --no-install --no-docker
```

The template is fetched from GitHub, so a local run needs network access.

## Guidelines

- Write a test for any behaviour change; the suite must stay green.
- Keep the modules focused — one responsibility each (fetch, customize,
  validate, git, runners, prompts, cli).
- External commands are spawned with argument arrays, never a shell string.
- Run `pnpm typecheck && pnpm test && pnpm build` before opening a pull request.

## Reporting issues

Open an issue with the command you ran, what you expected, and what happened
(including the full error output).
