import { describe, it, expect, afterEach, vi } from 'vitest'
import { run } from '../src/cli.js'

describe('--ref validation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); process.exitCode = 0 })

  it('rejects a ref with whitespace or path traversal before doing any work', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await run(['my-app', '--ref', 'bad ref'])

    expect(process.exitCode).toBe(1)
    expect(err).toHaveBeenCalledWith(expect.stringMatching(/Invalid --ref/))
    // Bailed out before touching the network.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
