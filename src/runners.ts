import { spawn } from 'node:child_process'

export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)),
    )
  })
}

export function commandExists(cmd: string): Promise<boolean> {
  const probe = process.platform === 'win32' ? 'where' : 'which'
  return new Promise((resolve) => {
    const child = spawn(probe, [cmd], { stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

export const runInstall = (dir: string) => run('pnpm', ['install'], dir)
export const runDocker = (dir: string) => run('docker', ['compose', 'up', '-d'], dir)
