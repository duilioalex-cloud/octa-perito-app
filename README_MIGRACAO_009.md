# Migração 009 — Agenda Pericial e Alertas

## Caminho

Supabase → projeto `octa-perito` → SQL Editor → New query.

## Procedimento

1. Desative a tradução automática do navegador.
2. Abra `009_calendar_alerts_sync.sql`.
3. Copie todo o conteúdo.
4. Cole no SQL Editor.
5. Clique em **Run**.

Resultado esperado:

```text
Success. No rows returned
```

## O que a migração faz

- cria o gatilho que sincroniza `process_deadlines` com `calendar_events`;
- atualiza eventos existentes sem duplicação;
- remove o evento correspondente quando um prazo é excluído;
- amplia a visão `calendar_event_alerts` com alertas de local ausente e confirmação pendente;
- preserva processos, documentos, laudos, honorários, despesas e anexos.
