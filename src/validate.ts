export type NameResult =
  | { ok: true; packageName: string; dirName: string }
  | { ok: false; reason: string }

// npm package name: optional @scope/, lowercase letters, digits, - . _ ~
const NPM_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

export function validateProjectName(input: string): NameResult {
  const name = input.trim()
  if (name === '.') return { ok: true, packageName: '.', dirName: '.' }
  if (name === '') return { ok: false, reason: 'Project name is required.' }
  if (name.includes('/') && !name.startsWith('@')) {
    return { ok: false, reason: 'Nested paths are not supported; use a single name or "."' }
  }
  if (name.includes('\\')) {
    return { ok: false, reason: 'Nested paths are not supported; use a single name or "."' }
  }
  if (!NPM_NAME.test(name)) {
    return { ok: false, reason: 'Not a valid npm package name (lowercase, url-safe).' }
  }
  const dirName = name.startsWith('@') ? name.split('/')[1] : name
  return { ok: true, packageName: name, dirName }
}
