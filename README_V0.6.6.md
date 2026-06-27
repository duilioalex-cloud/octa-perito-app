# OCTA Perito v0.6.6 — Despesas e Deslocamentos

## Conteúdo da versão

- menu **Despesas** no sistema;
- painel consolidado de custos por processo;
- cadastro de deslocamentos periciais;
- cálculo automático de distância total, combustível, veículo, tempo técnico e custos adicionais;
- cadastro e edição de despesas;
- vínculo de despesa com deslocamento;
- controle de despesas previstas, pendentes, pagas e canceladas;
- controle de despesas reembolsáveis;
- exclusão segura para proprietários e administradores;
- histórico das alterações no processo;
- botão **Despesas** dentro da página do processo;
- migração 008 para incluir deslocamentos no resultado financeiro consolidado.

## Ordem de instalação

### 1. Supabase

Execute o arquivo:

`supabase/migrations/008_expense_trip_dashboard.sql`

Caminho:

`Supabase → projeto octa-perito → SQL Editor → New query`

Resultado esperado:

`Success. No rows returned`

### 2. GitHub

Extraia o ZIP e envie todo o conteúdo para a raiz do repositório `octa-perito-app`, substituindo os arquivos existentes.

Mensagem de commit sugerida:

`Implementa despesas e deslocamentos v0.6.6`

### 3. Vercel

A instalação continua usando Bun:

- `bun install --no-cache --linker hoisted`
- `bun run build`

Não recrie `package-lock.json` e não adicione `.npmrc`.

## Teste funcional

1. Abra **Despesas**.
2. Selecione um processo.
3. Cadastre um deslocamento com origem, destino, distância, consumo, combustível, horas e custos adicionais.
4. Confira o cálculo automático.
5. Cadastre uma despesa.
6. Marque a despesa como paga.
7. Teste o fluxo de reembolso.
8. Confira o resumo financeiro do processo.

## Validação técnica

- `npx tsc --noEmit` — concluído
- `npm run lint` — concluído
- `npm run build` — concluído
