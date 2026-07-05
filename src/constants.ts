export const TEMPLATE_REPO = 'GaryHu-dev/nestjs-starter-kit'
export const DEFAULT_TEMPLATE_REF = 'main'

// codeload accepts a bare ref at /tar.gz/<ref>, where <ref> may be a branch,
// tag, or commit SHA — GitHub resolves it. The wrapper directory inside the
// tarball is named after the ref, but extraction strips it regardless.
export function templateTarballUrl(ref: string = DEFAULT_TEMPLATE_REF): string {
  return `https://codeload.github.com/${TEMPLATE_REPO}/tar.gz/${ref}`
}

// Abort the template download if it stalls, so the CLI never hangs forever.
export const FETCH_TIMEOUT_MS = 30_000

export const CLI_MIN_NODE = 18
export const PROJECT_MIN_NODE = 22

// Paths (relative to project root) removed from the generated project.
export const EXCLUDE_PATHS = [
  '.github',
  'docs/contributing.md',
  'docs/release.md',
  'LICENSE',
]
