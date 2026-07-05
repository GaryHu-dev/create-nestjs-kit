import { describe, it, expect } from 'vitest'
import { generateSecret } from '../src/secrets.js'

describe('generateSecret', () => {
  it('returns a 48-byte base64 string (64 chars)', () => {
    expect(generateSecret()).toHaveLength(64)
  })

  it('returns a different value on each call', () => {
    expect(generateSecret()).not.toBe(generateSecret())
  })
})
