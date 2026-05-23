import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('service worker endpoint', () => {
  it('serves an explicit no-op service worker for browsers with stale registrations', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js')

    expect(fs.existsSync(swPath)).toBe(true)
    expect(fs.readFileSync(swPath, 'utf8')).toContain('self.addEventListener')
  })
})
