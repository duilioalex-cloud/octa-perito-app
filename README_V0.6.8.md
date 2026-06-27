# OCTA Perito v0.6.8 — Painel Financeiro e Operacional

Esta versão substitui a visão geral básica por um painel executivo integrado aos módulos de processos, honorários, despesas, deslocamentos, agenda, alertas e laudos.

## Funcionalidades

- filtro de indicadores por mês atual, últimos 30 dias, últimos 90 dias, ano atual ou todo o período;
- valores propostos, homologados, depositados e levantados;
- custos realizados e resultado de caixa por período;
- posição acumulada da carteira financeira;
- saldo depositado aguardando levantamento;
- total ainda a receber;
- custos previstos, reembolsos pendentes e resultado previsto;
- indicadores operacionais de processos, laudos, compromissos e pendências;
- funil financeiro com conversão entre as etapas;
- fluxo de caixa dos últimos seis meses;
- composição dos custos por categoria;
- distribuição dos processos por etapa;
- prioridades para ação ordenadas por criticidade;
- próximos compromissos;
- ranking de processos por resultado previsto.

## Instalação

Não existe nova migração SQL. A versão utiliza as estruturas já criadas pelas migrações 007, 008 e 009.

1. Extraia o pacote.
2. Envie todo o conteúdo para a raiz do repositório `octa-perito-app`.
3. Substitua os arquivos existentes.
4. Faça o commit na branch principal.
5. Aguarde o deploy automático da Vercel.

Mensagem sugerida:

```text
Implementa painel financeiro e operacional v0.6.8
```

## Atenção ao deploy

A configuração que funcionou na Vercel foi preservada:

```text
bun install --no-cache --linker hoisted
bun run build
```

Não recrie os arquivos:

```text
package-lock.json
.npmrc
```

## Teste funcional

1. Abra o menu **Painel**.
2. Altere o período dos indicadores.
3. Confira os valores financeiros com os módulos de Honorários e Despesas.
4. Abra uma prioridade diretamente pelo painel.
5. Confira os próximos compromissos.
6. Valide o ranking de resultado previsto por processo.

## Validação técnica

```text
npm run lint       ✓
npx tsc --noEmit   ✓
npm run build      ✓
```
