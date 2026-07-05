# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-04

Initial release.

### Added
- Scaffold a project from the `nestjs-starter-kit` template: download the
  tarball, apply an exclude list, rewrite `package.json`, generate a `.env`
  with random JWT secrets, and initialise a fresh git repository.
- Optional dependency install and Docker startup, promptable or via flags.
- Flags: `--install`/`--no-install`, `--docker`/`--no-docker`, `--yes`,
  `--force`, and `--ref <branch|tag|sha>` to pin the template version.
- `--version` and `--help`.
- Graceful degradation: a missing `git`, `pnpm`, or Docker warns and continues
  instead of failing the scaffold; a failed install/Docker step never rolls the
  project back.
