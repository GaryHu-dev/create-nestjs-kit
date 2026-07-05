import { describe, it, expect } from 'vitest'
import { parseArgs, sanitizePackageName, nextSteps } from '../src/cli.js'

describe('parseArgs', () => {
  it('reads the positional dir', () => {
    expect(parseArgs(['my-app']).dir).toBe('my-app')
  })

  it('parses --no-install and --docker', () => {
    const o = parseArgs(['my-app', '--no-install', '--docker'])
    expect(o.install).toBe(false)
    expect(o.docker).toBe(true)
  })

  it('parses --yes and --force', () => {
    const o = parseArgs(['my-app', '--yes', '--force'])
    expect(o.yes).toBe(true)
    expect(o.force).toBe(true)
  })

  it('parses --ref and leaves it undefined by default', () => {
    expect(parseArgs(['my-app', '--ref', 'v1.2.0']).ref).toBe('v1.2.0')
    expect(parseArgs(['my-app']).ref).toBeUndefined()
  })
})

describe('sanitizePackageName', () => {
  it('lowercases and dashes an arbitrary directory name', () => {
    expect(sanitizePackageName('My App')).toBe('my-app')
  })

  it('keeps an already-valid name unchanged', () => {
    expect(sanitizePackageName('my-app')).toBe('my-app')
  })

  it('strips leading/trailing separators and falls back when empty', () => {
    expect(sanitizePackageName('.hidden.')).toBe('hidden')
    expect(sanitizePackageName('!!!')).toBe('app')
  })
})

describe('nextSteps', () => {
  it('shows install/docker lines only when they did not happen', () => {
    const notDone = nextSteps('my-app', false, false)
    expect(notDone).toContain('  pnpm install')
    expect(notDone).toContain('  docker compose up -d')

    const bothDone = nextSteps('my-app', true, true)
    expect(bothDone).not.toContain('pnpm install')
    expect(bothDone).not.toContain('docker compose up -d')
  })

  it('always includes the database and start steps, and cd unless "."', () => {
    expect(nextSteps('my-app', true, true)).toContain('  cd my-app')
    expect(nextSteps('.', true, true)).not.toContain('cd')
    const s = nextSteps('my-app', true, true)
    expect(s).toContain('pnpm migration:run')
    expect(s).toContain('pnpm seed')
    expect(s).toContain('pnpm start:dev')
  })
})
