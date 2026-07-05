import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { initRepo } from '../src/git.js'

const pexec = promisify(execFile)

describe('initRepo', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nsk-git-'))
    await writeFile(join(dir, 'file.txt'), 'hello')
  })

  it('creates a repo with exactly one commit', async () => {
    await initRepo(dir)
    const { stdout } = await pexec('git', ['-C', dir, 'rev-list', '--count', 'HEAD'])
    expect(stdout.trim()).toBe('1')
    await rm(dir, { recursive: true, force: true })
  })
})
