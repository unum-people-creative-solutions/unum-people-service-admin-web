import { describe, expect, test } from 'vitest'
import { servicosContratados } from './servicosContratados'
import type { Tenant } from '@/types/tenant'

// Verifier da fase 2, G6: a regra antiga da API (Tenant.HasService) na tela.
describe('servicosContratados', () => {
  const t = (x: Partial<Tenant>) => x as Tenant
  test('sem serviços e sem site vale o CRM', () => {
    expect(servicosContratados(t({ enabled_services: [] }))).toEqual(['crm'])
    expect(servicosContratados(t({}))).toEqual(['crm'])
  })
  test('com site, nada é presumido', () => {
    expect(servicosContratados(t({ enabled_services: [], site_urls: ['https://a.com'] }))).toEqual([])
    expect(servicosContratados(t({ enabled_services: [], site_url: 'https://a.com' }))).toEqual([])
  })
  test('com serviços, são eles', () => {
    expect(servicosContratados(t({ enabled_services: ['blog', 'site'] }))).toEqual(['blog', 'site'])
  })
})
