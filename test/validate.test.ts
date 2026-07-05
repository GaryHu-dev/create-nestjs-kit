import { describe, it, expect } from 'vitest'
import { validateProjectName } from '../src/validate.js'

describe('validateProjectName', () => {
  it('accepts a simple lowercase name', () => {
    expect(validateProjectName('my-app')).toEqual({
      ok: true, packageName: 'my-app', dirName: 'my-app',
    })
  })

  it('accepts the current-dir sentinel', () => {
    expect(validateProjectName('.')).toEqual({
      ok: true, packageName: '.', dirName: '.',
    })
  })

  it('accepts a scoped name and derives the dir from the last segment', () => {
    expect(validateProjectName('@acme/api')).toEqual({
      ok: true, packageName: '@acme/api', dirName: 'api',
    })
  })

  it('rejects an empty name', () => {
    const r = validateProjectName('')
    expect(r.ok).toBe(false)
  })

  it('rejects nested paths', () => {
    const r = validateProjectName('apps/api')
    expect(r.ok).toBe(false)
  })

  it('rejects uppercase / invalid npm names', () => {
    const r = validateProjectName('MyApp')
    expect(r.ok).toBe(false)
  })

  it('rejects backslash paths', () => {
    expect(validateProjectName('apps\\api').ok).toBe(false)
  })

  it('rejects a multi-segment scoped name', () => {
    expect(validateProjectName('@acme/nested/api').ok).toBe(false)
  })
})
