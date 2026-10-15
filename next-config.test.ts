import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import nextConfig from './next.config'

describe('next config', () => {
  it('keeps Turbopack root unpinned until the Next.js dev compile crash is resolved', () => {
    expect(nextConfig.turbopack?.root).toBeUndefined()
    // Os testes rodam na raiz deste app. Confere
    // pelo package.json, não pelo nome da pasta, que muda em clones e worktrees.
    const pacote = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
    expect(pacote.name).toBe('unum-people-services-admin-web')
  })
})
