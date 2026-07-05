import { generateSecret } from './secrets.js'

export function rewritePackageJson(raw: string, packageName: string): string {
  const pkg = JSON.parse(raw)
  pkg.name = packageName
  pkg.version = '0.0.0'
  pkg.license = 'UNLICENSED'
  delete pkg.author
  return JSON.stringify(pkg, null, 2) + '\n'
}

export function generateEnv(example: string): string {
  const replaceLine = (src: string, key: string, value: string): string => {
    const re = new RegExp(`^${key}=.*$`, 'm')
    if (!re.test(src)) {
      // The template's .env.example no longer has this key. Bailing out here
      // prevents shipping a .env that silently keeps the placeholder secret.
      throw new Error(
        `Expected "${key}=" in .env.example but it was not found — the template may have changed.`,
      )
    }
    // A function replacer inserts `value` literally, immune to $-substitution
    // patterns ($&, $1, …) that a string replacer would interpret.
    return src.replace(re, () => `${key}=${value}`)
  }

  let out = replaceLine(example, 'JWT_SECRET', generateSecret())
  out = replaceLine(out, 'JWT_REFRESH_SECRET', generateSecret())
  return out
}

export function generateReadme(projectName: string): string {
  return `# ${projectName}

A NestJS backend scaffolded with create-nestjs-kit.

## Quick start

\`\`\`bash
pnpm install
docker compose up -d      # starts Postgres
pnpm migration:run        # apply the schema
pnpm seed                 # optional: seed initial data
pnpm start:dev
\`\`\`

The API runs on http://localhost:3000 and Swagger docs on http://localhost:3000/docs.

## Docs

Deeper documentation lives in \`docs/\` — architecture, api, database, deployment.
`
}
