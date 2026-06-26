# OCTA Perito v0.6 — Honorários por Processo

Esta entrega implementa a primeira etapa da v0.6 sobre a migração `007_finance_calendar_dashboard.sql`.

## Funcionalidades

- painel consolidado de honorários por organização;
- totais propostos, homologados, depositados e levantados;
- separação entre saldo judicial e valor efetivamente recebido;
- filtros por processo e situação financeira;
- tela financeira individual de cada processo;
- cadastro e atualização dos honorários principais;
- modalidade de custeio e responsável pelo pagamento;
- percentual de adiantamento;
- datas de proposta, homologação, depósito e levantamento;
- registro de depósitos, levantamentos, devoluções e ajustes;
- lançamentos previstos, pendentes, confirmados ou cancelados;
- cálculo automático dos saldos por meio da migração 007;
- confirmação, cancelamento e exclusão segura de movimentações;
- integração do botão Honorários na página do processo;
- atualização do resumo financeiro do processo com os dados consolidados.

## Instalação

A migração 007 deve estar previamente executada no Supabase.

1. Extraia o pacote.
2. Envie todos os arquivos para o repositório `octa-perito-app`, substituindo os existentes.
3. Confirme o commit na branch principal.
4. Aguarde o deploy automático da Vercel.

Mensagem sugerida de commit:

```text
Implementa gestão de honorários por processo v0.6
```

Não há nova variável de ambiente e não é necessário executar outra migração para esta entrega.

## Teste funcional

1. Acesse **Honorários** no menu lateral.
2. Abra um processo.
3. Cadastre valor proposto e homologado.
4. Salve o controle.
5. Registre um depósito confirmado.
6. Registre um levantamento confirmado.
7. Confirme que os valores de saldo judicial e levantado são distintos.
8. Abra a página do processo e confira o resumo atualizado.

## Validação técnica

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Todos executados sem erros.
