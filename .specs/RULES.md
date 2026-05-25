# RULES.md - The Harness (Restrições Inquebráveis)

Este documento define os limites técnicos e comportamentais para todos os Agentes de IA. Qualquer violação interrompe o fluxo de entrega.

## 🛡️ Segurança e Integridade
1. **Controle de Versão**: NUNCA realize `git add`, `git commit` ou `git push` sem autorização explícita do usuário.
2. **Proteção de Credenciais**: Jamais exponha segredos em código. Use `.env.local` e KMS.
3. **Segurança de Dados**: Operações de banco de dados exigem validação de `tenant_id`.

## ⚙️ Protocolos de Engenharia
1. **Isolamento de Contexto**: Leia apenas arquivos estritamente necessários para a task.
2. **TDD-First (Red-First)**: Proibido alterar código de produção sem um teste falhando previamente.
3. **Surgical Changes**: Implemente apenas o necessário para satisfazer o teste. Sem refatorações fora de escopo.
4. **Zero Assumption**: Não invente APIs ou schemas. Na dúvida, retorne à Fase 2 (Architecture).

## 🎨 Design e UI
1. **Acessibilidade**: Testes devem priorizar `getByRole`. Assertivas via classes CSS utilitárias são proibidas.
2. **Bibliotecas**: Prefira Radix UI, Framer Motion e TanStack Query para componentes complexos.
3. **Performance**: Use `next/image` e `next/font` para otimização automática.

## 📊 Rastreamento e Atribuição (Se Aplicável)
1. **Leads**: Captura de `GCLID`, `FBCLID`, `UTMs` é obrigatória.
2. **Fluxo**: Botões de conversão devem disparar `LeadModal` antes do redirecionamento.

