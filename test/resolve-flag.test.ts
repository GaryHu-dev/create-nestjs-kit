import { describe, it, expect } from 'vitest'
import { resolveFlag } from '../src/cli.js'

describe('resolveFlag', () => {
  it('explicit true wins regardless of yes', () => {
    expect(resolveFlag(true, false, true)).toBe(true)
    expect(resolveFlag(true, true, false)).toBe(true)
  })

  it('explicit false wins regardless of yes', () => {
    expect(resolveFlag(false, false, true)).toBe(false)
    expect(resolveFlag(false, true, true)).toBe(false)
  })

  it('yes with no explicit falls back to yesDefault', () => {
    expect(resolveFlag(undefined, true, true)).toBe(true)
    expect(resolveFlag(undefined, true, false)).toBe(false)
  })

  it('neither explicit nor yes prompts', () => {
    expect(resolveFlag(undefined, false, true)).toBe('prompt')
    expect(resolveFlag(undefined, false, false)).toBe('prompt')
  })
})
