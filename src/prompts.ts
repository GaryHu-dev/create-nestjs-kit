import { text, confirm, isCancel } from '@clack/prompts'

export class CancelledError extends Error {
  constructor() { super('cancelled') }
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) throw new CancelledError()
  return value as T
}

export async function promptProjectName(): Promise<string> {
  return unwrap(await text({
    message: 'Project name',
    placeholder: 'my-app',
    validate: (v) => (v.trim() ? undefined : 'Required'),
  }))
}

export async function promptInstall(): Promise<boolean> {
  return unwrap(await confirm({ message: 'Install dependencies now (pnpm)?', initialValue: true }))
}

export async function promptDocker(): Promise<boolean> {
  return unwrap(await confirm({ message: 'Start Docker (docker compose up -d)?', initialValue: false }))
}
