# OCTA Perito v0.8.0

## Gestao de usuarios e controle de acesso

Esta versao adiciona o modulo multiusuario do OCTA Perito, com painel administrativo em:

`/configuracoes/usuarios`

## Perfis

- Proprietario: acesso total, protegido contra remocao e alteracao pela interface.
- Administrador: usuarios, configuracoes, processos, biblioteca, documentos, laudos, agenda e financeiro.
- Perito: processos, documentos, laudos, biblioteca, agenda e financeiro.
- Financeiro: honorarios, depositos, levantamentos, despesas, deslocamentos e indicadores financeiros.
- Assistente tecnico: apoio operacional, documentos, laudos e agenda, sem financeiro e sem exclusoes criticas.
- Consulta: visualizacao operacional, sem financeiro e sem edicao.

## Incluido

- Matriz central de permissoes em `lib/permissions.ts`.
- Menus filtrados por permissao.
- Tela de acesso negado.
- Painel de usuarios com convite por e-mail, alteracao de nivel, remocao e reenvio.
- Protecao de rotas financeiras para assistente tecnico e consulta.
- Dashboard operacional sem valores financeiros para usuarios sem permissao.
- RLS financeiro para bloquear acesso no banco, nao apenas na interface.
- Migração `010_role_based_access_control.sql`.

## Variavel obrigatoria para convites

Para enviar convites pelo Supabase Auth, configure no ambiente do servidor:

`SUPABASE_SERVICE_ROLE_KEY`

## Migração

Execute no Supabase SQL Editor:

`supabase/migrations/010_role_based_access_control.sql`

Resultado esperado:

`Success. No rows returned`

## Observacao

O perfil Perito tem acesso financeiro por padrao. Quem nao ve financeiro por padrao sao Assistente tecnico e Consulta.
