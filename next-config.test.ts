import path from 'node:path'
import { describe, expect, it } from 'vitest'

import nextConfig from './next.config'

describe('next config', () => {
  it('keeps Turbopack root unpinned until the Next.js dev compile crash is resolved', () => {
    expect(nextConfig.turbopack?.root).toBeUndefined()
    expect(path.basename(process.cwd())).toBe('unum-people-services-admin-web')
  })
})
