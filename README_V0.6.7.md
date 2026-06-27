# OCTA Perito v0.6.7 — Agenda Pericial e Alertas

## Funcionalidades

- Agenda mensal com 42 dias e compromissos por data.
- Lista operacional com filtros por título, processo, tipo e status.
- Cadastro e edição de diligências, vistorias, reuniões, audiências, prazos e vencimentos financeiros.
- Vinculação opcional do compromisso a um processo.
- Controle de responsável, prioridade, local, endereço e lembretes.
- Participantes com contato, função e situação de presença.
- Ações rápidas: confirmar, concluir, reagendar, cancelar e excluir.
- Central de alertas para vencidos, próximas 24 horas, 3 dias e 7 dias.
- Alertas de eventos sem local, diligências sem confirmação, honorários e reembolsos pendentes.
- Preferências individuais de alertas.
- Integração da agenda ao painel principal e aos processos.
- Sincronização automática entre prazos processuais e agenda.

## Migração obrigatória

Execute `supabase/migrations/009_calendar_alerts_sync.sql` no SQL Editor do Supabase antes de publicar a interface.

Resultado esperado:

```text
Success. No rows returned
```

## Instalação

1. Extraia o pacote.
2. Envie todo o conteúdo para a raiz do repositório `octa-perito-app`.
3. Substitua os arquivos existentes.
4. Não envie `package-lock.json` ou `.npmrc`.
5. Commit sugerido: `Implementa agenda pericial e central de alertas v0.6.7`.
6. Aguarde o deploy com Bun na Vercel.

## Observação sobre e-mail

A central de alertas funciona dentro do sistema. As preferências de e-mail e resumo diário são armazenadas, mas o disparo automático externo será implementado em etapa posterior com um serviço agendado.

## Validação técnica

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Todos concluídos sem erros.
