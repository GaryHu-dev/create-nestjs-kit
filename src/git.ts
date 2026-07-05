import { spawn } from 'node:child_process'
import { run } from './runners.js'

// Resolves true only when `git config <key>` exits 0 in `dir` — a missing key
// exits 1, which is expected (not an error), so we can't use `run()` here.
function gitConfigResolves(dir: string, key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['config', key], { cwd: dir, stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

async function hasGitIdentity(dir: string): Promise<boolean> {
  const [hasName, hasEmail] = await Promise.all([
    gitConfigResolves(dir, 'user.name'),
    gitConfigResolves(dir, 'user.email'),
  ])
  return hasName && hasEmail
}

export async function initRepo(dir: string): Promise<void> {
  await run('git', ['init'], dir)
  await run('git', ['add', '-A'], dir)
  const identityConfigured = await hasGitIdentity(dir)
  const args = identityConfigured
    ? ['commit', '-m', 'Initial commit from create-nestjs-kit']
    : [
        '-c', 'user.name=create-nestjs-kit',
        '-c', 'user.email=noreply@create-nestjs-kit',
        'commit', '-m', 'Initial commit from create-nestjs-kit',
      ]
  await run('git', args, dir)
}
