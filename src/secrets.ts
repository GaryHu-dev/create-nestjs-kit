import { randomBytes } from 'node:crypto'

export function generateSecret(): string {
  return randomBytes(48).toString('base64')
}
