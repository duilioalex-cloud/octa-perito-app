# OCTA Perito v0.7.0 — Painel Financeiro e Operacional

A versão 0.7.0 consolida o painel executivo e acrescenta filtragem por processo, mantendo os filtros temporais já existentes.

## Recursos do painel

- honorários propostos, homologados, depositados e levantados;
- despesas pagas e previstas;
- custos de deslocamentos previstos e realizados;
- resultado previsto e resultado efetivamente realizado em caixa;
- processos ativos e processos sem movimentação há 30 dias;
- diligências e vistorias ativas;
- laudos em elaboração ou revisão;
- prazos dos próximos sete dias e prazos vencidos;
- pendências de depósito, levantamento e demais etapas financeiras;
- funil financeiro, composição de custos, histórico de caixa e ranking dos processos;
- filtro por período e por processo judicial.

## Regras dos filtros

### Filtro por período

É aplicado aos indicadores de fluxo:

- propostas e homologações registradas no período;
- depósitos e levantamentos confirmados no período;
- despesas e deslocamentos datados no período;
- resultado previsto e resultado de caixa do período.

### Filtro por processo

É aplicado a todo o painel:

- indicadores financeiros;
- posição acumulada;
- gráficos e composição dos custos;
- diligências, prazos, laudos e pendências;
- lista de prioridades e próximos compromissos.

A posição financeira acumulada e os indicadores operacionais representam o estado atual. O período não altera saldos acumulados, mas o processo selecionado restringe esses saldos ao processo escolhido.

## Classificação operacional

- **Diligências ativas:** eventos dos tipos `diligence` e `inspection` que não estejam concluídos ou cancelados.
- **Prazos:** entrega de laudo, esclarecimentos, manifestação e vencimentos financeiros.
- **Laudos em andamento:** registros com status `draft` ou `in_review`.
- **Pendência financeira:** processo cujo fluxo financeiro ainda não esteja integralmente levantado, cancelado ou marcado como não definido.

## Banco de dados

Não há nova migração SQL. A versão utiliza as tabelas e views das migrações 007, 008 e 009.

## Publicação

1. Substitua o conteúdo do repositório pelo conteúdo deste pacote.
2. Confirme a presença de `app/dashboard.css`.
3. Não envie `node_modules`, `.next`, `package-lock.json` ou `.npmrc`.
4. Faça o deploy na Vercel sem reutilizar o cache anterior.
5. Atualize o painel com `Ctrl + F5` após a publicação.

Mensagem sugerida de commit:

```text
Evolui painel financeiro e operacional para v0.7.0
```

## Validação executada

```text
npm run lint
npx tsc --noEmit
npm run build
```
