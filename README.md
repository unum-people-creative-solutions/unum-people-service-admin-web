
## 📚 Documentação Oficial (Arquitetura e TDDs)

**Nota Importante:** A documentação técnica detalhada, as regras de IA (Harness), os Technical Design Documents (TDDs) e o log de estado contínuo deste projeto **não ficam armazenados neste repositório**. 

Para obter o contexto arquitetural completo e consultar o *Single Source of Truth* do ecossistema, acesse o repositório centralizado de documentação:
👉 **[unum-people-docs](https://github.com/unum-people-creative-solutions/unum-people-docs.git)**

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Fora do Google

O painel inteiro pede para não indexar (`robots` nos metadados de `src/app/layout.tsx`, `noindex, nofollow`) e o `robots.txt` (`src/app/robots.ts`) bloqueia tudo. É um painel interno: quem não está logado só vê a tela `/login` do próprio painel (login direto pelo `amazon-cognito-identity-js`, sem o Hosted UI), que não tem nada a oferecer na busca.

## Termos de Contratação de Serviço

Tela `(admin)/terms` — CRUD de `Term`/`TermVersion` (o operador escreve o conteúdo em Markdown; o backend renderiza, sanitiza e publica em S3). Cada `Plan` pago é vinculado a um termo (obrigatório, inclusive para planos já existentes); para tenants `PERSONALIZADO`/`LIVRE` o termo é escolhido manualmente no formulário de criação/edição do tenant. O detalhe do tenant mostra o status do aceite (`ServiceAgreementCard`, ao lado do `BillingCard`) — o aceite em si é sempre feito pelo Administrador do Portal da empresa (permissão `portal.contrato.aceitar`), nunca pelo operador aqui. O painel só aceita o grupo `GlobalAdmin` (desde a fase 5, o grupo legado `Admins` não entra), e o convite de usuário manda só `acessos`, com o Portal. O detalhe do tenant também lista as notas fiscais de serviço emitidas (`TenantInvoicesSection`, mesmo bloco do `BillingCard`/`ServiceAgreementCard`) — busca via `GET /admin/tenants/{id}/invoices`, exibe status/link de PDF quando autorizada; só leitura, sem ação de emissão manual nesta fase.

## Planos (produto e cota de páginas)

Tela `(admin)/plans` — o formulário de plano envia `product` (`plataforma` | `landing-page`) e `pages_included`. Plano legado chega da API com `product: ""` (chave presente; o `omitempty` do backend está só no DynamoDB) e `pages_included: 0`; a leitura trata string vazia como `plataforma`. A cota mínima de landing page é validada pelo backend (400/409); a UI só exibe o erro retornado.

O formulário também tem **Destaques (um por linha)** (`textarea#destaques`) e **Selo (opcional)** (`input#selo`, `maxLength` 30), que alimentam o card do plano na vitrine pelo catálogo público. Cada linha não vazia vira um item de `destaques` (vírgula não separa); ao editar, o campo mostra os destaques atuais um por linha. **Toda** criação e atualização envia `destaques` (lista, inclusive vazia) e `selo` (string, inclusive vazia): o `PUT /admin/plans/{slug}` do backend substitui o item inteiro, então omitir os campos apagaria os textos. `planService.listPlans` entrega `destaques: []` e `selo: ''` para plano gravado antes dos campos. Limites (até 8 destaques de 80 caracteres, selo de 30) são validados pelo backend (400); a UI só exibe o erro retornado.

## Papéis e acessos (gestão de acesso, fase 2)

- **Menu Papéis (`/acessos/papeis`):** uma aba por ferramenta do catálogo (`GET /admin/acessos/catalogo`), com os papéis padrão só para leitura e os personalizados com criar, editar e excluir. Na gaveta, marcar uma permissão marca as que ela requer. Um papel em uso não pode ser excluído: o diálogo lista as empresas. A aba Histórico mostra as mudanças de papéis.
- **Detalhe do tenant, Usuários:** uma coluna por ferramenta contratada, mais o Portal. O papel implícito aparece com `*` e, no seletor, como "Automático (…)". O contador "N de M usuários" usa `max_usuarios` do plano. O convite manda `acessos`, e o operador pode convidar acima do limite. A seção "Histórico de acesso" abaixo de Usuários carrega só quando aberta.
- **Planos:** campo "Máximo de usuários" (0 = sem limite).
- Os erros da API aparecem na tela; `ApiError.detalhes` traz o corpo inteiro (`faltando`, `em_uso`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
