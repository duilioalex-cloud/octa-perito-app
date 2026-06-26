# OCTA Perito App — MVP 0.2

Aplicação web da OCTA SYSTEMS para gestão de perícias judiciais, extrajudiciais e assistência técnica.

## Entregas desta versão

- Dashboard com processos ativos, prazos vencidos, honorários e modelos.
- Cadastro ampliado de processos.
- Pesquisa e filtro por status.
- Edição completa do processo.
- Controle básico de honorários propostos, arbitrados, depositados e recebidos.
- Cadastro e conclusão de prazos.
- Histórico de atividades do processo.
- Priorização e fluxo de status pericial.

## Migração obrigatória

Antes de publicar esta versão, execute no Supabase SQL Editor:

```text
supabase/migrations/002_process_management.sql
```

A migração amplia a tabela `processes` e cria:

- `process_deadlines`
- `process_activities`

Ela também cria índices, gatilhos de atualização e políticas RLS.

## Publicação

1. Substitua os arquivos do repositório pelo conteúdo desta versão.
2. Confirme o commit na branch principal.
3. Aguarde a implantação automática da Vercel.
4. Teste primeiro com dados fictícios.

## Pendência registrada

O redirecionamento de confirmação de e-mail do Supabase será ajustado antes do lançamento comercial.
