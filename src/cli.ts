import { Command } from 'commander'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { intro, outro, log, cancel } from '@clack/prompts'
import { validateProjectName } from './validate.js'
import { fetchTemplate } from './fetch-template.js'
import { rewritePackageJson, generateEnv, generateReadme } from './customize.js'
import { initRepo } from './git.js'
import { commandExists, runInstall, runDocker } from './runners.js'
import { promptProjectName, promptInstall, promptDocker, CancelledError } from './prompts.js'
import { CLI_MIN_NODE, PROJECT_MIN_NODE, templateTarballUrl } from './constants.js'

// Resolved relative to this module, so it works both from source (src/ → ../)
// and from the bundled binary (dist/ → ../), i.e. the package root package.json.
const { version: VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

export interface CliOptions {
  dir?: string
  install?: boolean
  docker?: boolean
  yes: boolean
  force: boolean
  ref?: string
}

export function parseArgs(argv: string[]): CliOptions {
  const program = new Command()
  program
    .name('create-nestjs-kit')
    .version(VERSION, '-v, --version')
    .argument('[dir]', 'project name or "." for the current directory')
    .option('--install', 'install dependencies')
    .option('--no-install', 'skip installing dependencies')
    .option('--docker', 'start docker compose')
    .option('--no-docker', 'skip docker')
    .option('-y, --yes', 'accept defaults, skip prompts', false)
    .option('-f, --force', 'allow a non-empty target directory', false)
    .option('--ref <ref>', 'template branch, tag, or commit SHA (default: main)')
    .allowExcessArguments(false)
  program.parse(argv, { from: 'user' })
  const opts = program.opts()
  return {
    dir: program.args[0],
    install: opts.install,   // undefined unless a flag was passed
    docker: opts.docker,
    yes: Boolean(opts.yes),
    force: Boolean(opts.force),
    ref: opts.ref,
  }
}

function nodeMajor(): number {
  return Number(process.versions.node.split('.')[0])
}

// Run `fn` with a one-shot SIGINT handler that removes a partially-created
// directory before exiting. Covers a hard Ctrl-C during long I/O (download,
// extraction) that would otherwise kill the process before the catch/cleanup
// below can run, leaving a half-written project behind. The handler is scoped
// to `fn` only, so it never competes with @clack's own prompt-cancel handling.
async function withSigintCleanup<T>(cleanup: () => void, fn: () => Promise<T>): Promise<T> {
  const onSigint = () => {
    cleanup()
    process.exit(130)
  }
  process.once('SIGINT', onSigint)
  try {
    return await fn()
  } finally {
    process.removeListener('SIGINT', onSigint)
  }
}

export function resolveFlag(explicit: boolean | undefined, yes: boolean, yesDefault: boolean): boolean | 'prompt' {
  if (explicit !== undefined) return explicit
  if (yes) return yesDefault
  return 'prompt'
}

// Coerce an arbitrary directory name into a valid npm package name. Used only
// for the `.` (current directory) case, where the folder name is out of our
// control.
export function sanitizePackageName(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-._]+|[-._]+$/g, '')
  return cleaned || 'app'
}

export async function run(argv: string[]): Promise<void> {
  if (nodeMajor() < CLI_MIN_NODE) {
    console.error(`create-nestjs-kit requires Node >= ${CLI_MIN_NODE} (current: ${process.versions.node}).`)
    process.exitCode = 1
    return
  }

  const opts = parseArgs(argv)

  // `ref` is concatenated into the codeload URL. Legit refs use word chars,
  // dots, slashes, and dashes; reject anything else (and `..`) to avoid a
  // malformed URL or path traversal.
  if (opts.ref !== undefined && (!/^[\w./-]+$/.test(opts.ref) || opts.ref.includes('..'))) {
    console.error(`Invalid --ref "${opts.ref}".`)
    process.exitCode = 1
    return
  }

  intro('create-nestjs-kit')

  // 1. Resolve project name
  let rawName = opts.dir
  if (!rawName) {
    try {
      rawName = await promptProjectName()
    } catch (err) {
      if (err instanceof CancelledError) {
        cancel('Cancelled.')
        process.exitCode = 1
        return
      }
      throw err
    }
  }
  const parsed = validateProjectName(rawName)
  if (!parsed.ok) {
    cancel(parsed.reason)
    process.exitCode = 1
    return
  }

  const intoCwd = parsed.dirName === '.'
  const targetDir = intoCwd ? process.cwd() : resolve(process.cwd(), parsed.dirName)
  // For `.`, derive the package name from the cwd — but the directory name
  // isn't guaranteed to be a legal npm name (e.g. "My App"), so sanitize it.
  const packageName = intoCwd ? sanitizePackageName(basename(process.cwd())) : parsed.packageName

  // 2. Empty-dir guard
  const dirExistedBefore = existsSync(targetDir)
  if (dirExistedBefore && readdirSync(targetDir).length > 0 && !opts.force) {
    cancel(`Directory "${targetDir}" is not empty. Use --force to override.`)
    process.exitCode = 1
    return
  }
  if (!dirExistedBefore) mkdirSync(targetDir, { recursive: true })

  const createdDir = !intoCwd && !dirExistedBefore
  try {
    // 3. Fetch + extract (SIGINT here would otherwise leave a partial dir)
    log.step('Fetching template…')
    await withSigintCleanup(
      () => { if (createdDir) rmSync(targetDir, { recursive: true, force: true }) },
      () => fetchTemplate(targetDir, templateTarballUrl(opts.ref)),
    )

    // 4. Customize package.json
    const pkgPath = join(targetDir, 'package.json')
    if (!existsSync(pkgPath)) {
      throw new Error('Template is missing package.json — the upstream template may have changed.')
    }
    writeFileSync(pkgPath, rewritePackageJson(readFileSync(pkgPath, 'utf8'), packageName))

    // 5. Generate .env from .env.example
    const examplePath = join(targetDir, '.env.example')
    if (!existsSync(examplePath)) {
      throw new Error('Template is missing .env.example — the upstream template may have changed.')
    }
    writeFileSync(join(targetDir, '.env'), generateEnv(readFileSync(examplePath, 'utf8')))

    // 6. Regenerate README
    writeFileSync(join(targetDir, 'README.md'), generateReadme(packageName))

    // 7. Fresh git history (after .env exists). Make sure .env is git-ignored
    // first, so the generated secrets are never committed even if the upstream
    // template ever drops that rule. Git is guarded like install/docker: a
    // missing git degrades to a warning rather than rolling back the scaffold.
    ensureEnvIgnored(targetDir)
    if (await commandExists('git')) {
      log.step('Initialising git repository…')
      await initRepo(targetDir)
    } else {
      log.warn('git not found; skipping repository initialisation.')
    }

    // 8. Optional install. `installed` tracks what actually happened (a skip or
    // failure leaves it false) so the summary reflects reality.
    let installed = false
    const installDecision = resolveFlag(opts.install, opts.yes, true)
    const doInstall = installDecision === 'prompt' ? await promptInstall() : installDecision
    if (doInstall) {
      if (await commandExists('pnpm')) {
        log.step('Installing dependencies…')
        try {
          await runInstall(targetDir)
          installed = true
        } catch {
          log.warn('pnpm install failed. Run `pnpm install` in the project directory to retry.')
        }
      } else {
        log.warn('pnpm not found. Run `corepack enable pnpm` then `pnpm install`.')
      }
    }

    // 9. Optional docker
    let dockered = false
    const dockerDecision = resolveFlag(opts.docker, opts.yes, false)
    const doDocker = dockerDecision === 'prompt' ? await promptDocker() : dockerDecision
    if (doDocker) {
      if (await commandExists('docker')) {
        log.step('Starting Docker…')
        try {
          await runDocker(targetDir)
          dockered = true
        } catch {
          log.warn('docker compose failed. Start it later with `docker compose up -d`.')
        }
      } else {
        log.warn('docker not found. Start it later with `docker compose up -d`.')
      }
    }

    // 10. Node version warning for the generated project
    if (nodeMajor() < PROJECT_MIN_NODE) {
      log.warn(`This project requires Node >= ${PROJECT_MIN_NODE}; you are on ${process.versions.node}.`)
    }

    outro(nextSteps(intoCwd ? '.' : parsed.dirName, installed, dockered))
  } catch (err) {
    if (createdDir) rmSync(targetDir, { recursive: true, force: true })
    if (err instanceof CancelledError) {
      cancel('Cancelled.')
    } else {
      cancel(err instanceof Error ? err.message : String(err))
    }
    process.exitCode = 1
  }
}

// Ensure the generated project ignores `.env`, so freshly generated secrets are
// never committed even if the upstream template drops the rule. Appends a bare
// `.env` line to `.gitignore` only when nothing already ignores it.
function ensureEnvIgnored(dir: string): void {
  const gitignorePath = join(dir, '.gitignore')
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : ''
  const alreadyIgnored = existing
    .split(/\r?\n/)
    .some((line) => { const t = line.trim(); return t === '.env' || t === '.env*' })
  if (!alreadyIgnored) {
    const sep = existing && !existing.endsWith('\n') ? '\n' : ''
    writeFileSync(gitignorePath, `${existing}${sep}.env\n`)
  }
}

export function nextSteps(dir: string, installed: boolean, dockered: boolean): string {
  const lines = ['Next steps:']
  if (dir !== '.') lines.push(`  cd ${dir}`)
  if (!installed) lines.push('  pnpm install')
  if (!dockered) lines.push('  docker compose up -d')
  lines.push('  pnpm migration:run')
  lines.push('  pnpm seed')
  lines.push('  pnpm start:dev')
  return lines.join('\n')
}
