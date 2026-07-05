import { describe, it, expect } from 'vitest'
import { rewritePackageJson, generateEnv, generateReadme } from '../src/customize.js'

const PKG = JSON.stringify({
  name: 'nestjs-starter-kit',
  version: '1.0.0',
  author: 'someone',
  license: 'MIT',
  private: true,
  packageManager: 'pnpm@11.9.0',
  engines: { node: '>=22' },
}, null, 2)

describe('rewritePackageJson', () => {
  it('sets name, resets version, unlicenses, drops author, keeps pnpm bits', () => {
    const out = JSON.parse(rewritePackageJson(PKG, 'my-app'))
    expect(out.name).toBe('my-app')
    expect(out.version).toBe('0.0.0')
    expect(out.license).toBe('UNLICENSED')
    expect(out.author).toBeUndefined()
    expect(out.private).toBe(true)
    expect(out.packageManager).toBe('pnpm@11.9.0')
    expect(out.engines).toEqual({ node: '>=22' })
  })
})

describe('generateEnv', () => {
  const example = [
    'NODE_ENV=development',
    'JWT_SECRET=change_me_to_a_secure_random_string_at_least_32_chars',
    'JWT_REFRESH_SECRET=change_me_to_another_secure_random_string_at_least_32_chars',
    'PORT=3000',
  ].join('\n')

  it('replaces both secrets with distinct non-placeholder values', () => {
    const out = generateEnv(example)
    const secret = out.match(/^JWT_SECRET=(.+)$/m)![1]
    const refresh = out.match(/^JWT_REFRESH_SECRET=(.+)$/m)![1]
    expect(secret).not.toContain('change_me')
    expect(refresh).not.toContain('change_me')
    expect(secret).not.toBe(refresh)
  })

  it('leaves other lines untouched', () => {
    const out = generateEnv(example)
    expect(out).toContain('NODE_ENV=development')
    expect(out).toContain('PORT=3000')
  })

  it('throws instead of silently keeping a placeholder when a secret key is missing', () => {
    const drifted = 'NODE_ENV=development\nJWT_SECRET=change_me\nPORT=3000'
    // JWT_REFRESH_SECRET absent — must fail loudly, not ship a weak secret.
    expect(() => generateEnv(drifted)).toThrow(/JWT_REFRESH_SECRET/)
  })
})

describe('generateReadme', () => {
  it('uses the project name as the H1 and includes quick-start commands', () => {
    const md = generateReadme('my-app')
    expect(md).toMatch(/^# my-app/m)
    expect(md).toContain('pnpm migration:run')
    expect(md).toContain('docs/')
  })
})
