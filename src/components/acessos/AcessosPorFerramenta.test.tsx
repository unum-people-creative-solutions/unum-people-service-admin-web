import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { AcessosPorFerramenta } from './AcessosPorFerramenta'
import type { MudancasDeAcesso } from '@/types/acesso'
import { catalogo, leitor } from './fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-17, blueprint §4.1 e §4.2 (UI-2).

function Controlado({ inicial, aoMudar }: { inicial: MudancasDeAcesso; aoMudar: (v: MudancasDeAcesso) => void }) {
  const [valor, setValor] = useState(inicial)
  return (
    <AcessosPorFerramenta catalogo={catalogo} papeis={[leitor]} servicosContratados={['crm', 'blog']} valor={valor}
      aoMudar={(v) => { setValor(v); aoMudar(v) }} />
  )
}

describe('AcessosPorFerramenta', () => {
  test('um seletor por ferramenta contratada, mais o Portal; Portal sem "Sem acesso"', () => {
    render(<Controlado inicial={{ portal: 'membro' }} aoMudar={vi.fn()} />)
    expect(screen.getByLabelText('Portal do Cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('CRM')).toBeInTheDocument()
    expect(screen.getByLabelText('Blog')).toBeInTheDocument()
    expect(screen.queryByLabelText('Páginas')).not.toBeInTheDocument()
    const portal = screen.getByLabelText('Portal do Cliente')
    expect(Array.from((portal as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Administrador', 'Membro'])
  })

  test('outras ferramentas: Automático primeiro, padrões, personalizados da ferramenta', () => {
    render(<Controlado inicial={{ portal: 'membro' }} aoMudar={vi.fn()} />)
    const crm = screen.getByLabelText('CRM') as HTMLSelectElement
    expect(Array.from(crm.options).map((o) => o.text)).toEqual(['Automático (Sem acesso)', 'Gestor', 'Vendedor', 'Sem acesso', 'Leitor'])
    expect(crm.value).toBe('')
    const blog = screen.getByLabelText('Blog') as HTMLSelectElement
    expect(Array.from(blog.options).map((o) => o.text)).not.toContain('Leitor')
  })

  test('o Automático acompanha o Portal na hora', () => {
    render(<Controlado inicial={{ portal: 'membro' }} aoMudar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Portal do Cliente'), { target: { value: 'administrador' } })
    expect((screen.getByLabelText('CRM') as HTMLSelectElement).options[0].text).toBe('Automático (Gestor)')
    expect((screen.getByLabelText('Blog') as HTMLSelectElement).options[0].text).toBe('Automático (Editor)')
  })

  test('mudar devolve o mapa; Automático volta como ""', () => {
    const aoMudar = vi.fn()
    render(<Controlado inicial={{ portal: 'membro', crm: 'vendedor' }} aoMudar={aoMudar} />)
    fireEvent.change(screen.getByLabelText('CRM'), { target: { value: 'p-aaaaaaaaaaaa' } })
    expect(aoMudar).toHaveBeenLastCalledWith({ portal: 'membro', crm: 'p-aaaaaaaaaaaa' })
    fireEvent.change(screen.getByLabelText('CRM'), { target: { value: '' } })
    expect(aoMudar).toHaveBeenLastCalledWith({ portal: 'membro', crm: '' })
  })

  test('desabilitado trava todos os seletores', () => {
    render(<AcessosPorFerramenta catalogo={catalogo} papeis={[]} servicosContratados={['crm']} valor={{ portal: 'membro' }} aoMudar={vi.fn()} desabilitado />)
    expect(screen.getByLabelText('Portal do Cliente')).toBeDisabled()
    expect(screen.getByLabelText('CRM')).toBeDisabled()
  })
})
