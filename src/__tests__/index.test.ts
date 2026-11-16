// @vitest-environment node
import { readFileSync } from 'node:fs'
import { VERSION } from '../index'

describe('linkshelf', () => {
  it('VERSION は package.json の version と同じ', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')) as { version: string }
    expect(VERSION).toBe(pkg.version)
  })
})
