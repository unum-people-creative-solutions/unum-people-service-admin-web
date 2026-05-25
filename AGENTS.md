# AGENTS.md - Orientação e Orquestração (TLC 2.0)

Este repositório opera sob a metodologia **Elite SaaS** e o ciclo de vida **TLC 2.0**.

## 🏛️ Máquina de Estados do Ciclo de Vida
Diretriz absoluta: **NENHUMA LINHA DE CÓDIGO DE PRODUÇÃO OU TESTE DEVE SER ESCRITA ANTES DA FASE 5.**

1. **FASE 1: DISCOVERY** - Alinhamento de escopo e restrições.
2. **FASE 2: ARCHITECTURE** - Mapeamento via `codenavi` e criação do `TDD-*.md`.
3. **FASE 3: DESIGN & UI** - Definição visual via `frontend-blueprint`.
4. **FASE 4: SPECIFICATION** - Backlog e Planos de Teste via `tlc-spec-driven`.
5. **FASE 5: EXECUTION** - Implementação via Pipeline de Personas.

## 🎭 Pipeline de Execução (Handoff Sequencial)
A Fase 5 exige a separação rígida de responsabilidades:

### 1. Agente QA (Analista de Qualidade)
- **Objetivo**: Criar testes que falham (**RED**) baseados no `TDD-*.md`.
- **Foco**: Acessibilidade (`getByRole`), Happy Path e Edge Cases.
- **Handoff**: "Testes escritos e falhando. Handoff para o Agente Executor."

### 2. Agente Executor (Engenheiro de Software)
- **Objetivo**: Implementar o código mínimo para passar os testes (**GREEN**).
- **Skills**: `tailwind-expert`, `react-best-practices`, `terraform-expert`, etc.
- **Handoff**: "Código implementado. Testes passando. Handoff para o Agente Auditor."

### 3. Agente Auditor (Revisor)
- **Objetivo**: Validar segurança (`security-best-practices`), convenções e cobertura.
- **Handoff**: "Auditoria concluída. Task marcada como DONE."

## 🛡️ Regras e Harness
Consulte estritamente o arquivo `.specs/RULES.md` para restrições técnicas e comportamentais inquebráveis.

## 📝 Comandos e Contexto Local
Admin web interface for scalable services.

