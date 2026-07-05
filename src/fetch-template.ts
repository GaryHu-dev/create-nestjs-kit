import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { extract } from 'tar'
import { EXCLUDE_PATHS, FETCH_TIMEOUT_MS, templateTarballUrl } from './constants.js'

// True when the stripped path equals, or sits under, any excluded path.
function isExcluded(strippedPath: string): boolean {
  const p = strippedPath.replace(/\\/g, '/').replace(/\/$/, '')
  return EXCLUDE_PATHS.some((ex) => p === ex || p.startsWith(ex + '/'))
}

// Defense-in-depth: the exclude filter relies on tar's (version-specific)
// filter-path shape. If that contract ever changes, excluded files would leak
// silently into every generated project. Verify they're absent and fail loudly.
export function assertExcludesAbsent(destDir: string): void {
  for (const ex of EXCLUDE_PATHS) {
    if (existsSync(join(destDir, ex))) {
      throw new Error(
        `Exclude "${ex}" leaked into the extracted template — the tar filter contract may have changed.`,
      )
    }
  }
}

export async function extractTarball(buffer: Uint8Array, destDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const parser = extract({
      cwd: destDir,
      strip: 1,
      filter: (path) => {
        // Verified against the installed tar (pinned to v7.5.19): `filter`
        // receives the ORIGINAL entry path, still including the wrapper segment
        // (e.g. "pkg-abc123/docs/contributing.md"), even though `strip: 1`
        // removes that segment on disk. Drop it here so EXCLUDE_PATHS matches
        // the post-strip layout.
        const stripped = path.split('/').slice(1).join('/')
        return stripped !== '' && !isExcluded(stripped)
      },
    })
    parser.on('close', resolve)
    parser.on('error', reject)
    parser.end(Buffer.from(buffer))
  })

  assertExcludesAbsent(destDir)
}

export async function fetchTemplate(
  destDir: string,
  url = templateTarballUrl(),
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let buffer: Uint8Array
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Failed to download template (${res.status}) from ${url}`)
    }
    buffer = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `Timed out downloading template after ${FETCH_TIMEOUT_MS / 1000}s from ${url}`,
      )
    }
    // Preserve an explicit non-ok/status error (already carries the URL);
    // wrap a raw network error so the message names the URL too.
    if (err instanceof Error && err.message.startsWith('Failed to download template')) {
      throw err
    }
    throw new Error(
      `Failed to download template from ${url}: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timer)
  }

  // Extraction (and its leak guard) runs outside the network timeout and
  // propagates its own errors unwrapped, so a real extract failure is never
  // misreported as a download timeout.
  await extractTarball(buffer, destDir)
}
