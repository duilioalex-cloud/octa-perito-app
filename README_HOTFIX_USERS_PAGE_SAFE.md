# Hotfix - tela de usuarios

Este pacote corrige a tela `/configuracoes/usuarios` para nao quebrar com erro branco quando o Supabase retorna erro ao carregar membros/perfis.

## Arquivo para subir no GitHub

Substitua este arquivo no repositorio:

`app/(app)/configuracoes/usuarios/page.tsx`

## Passo obrigatorio no Supabase

Se a pagina ainda mostrar aviso de erro, execute a migracao completa:

`supabase/migrations/010_role_based_access_control.sql`

No Supabase:

1. Abra o projeto do OCTA Perito.
2. Va em SQL Editor.
3. Cole todo o conteudo de `010_role_based_access_control.sql`.
4. Clique em Run.

Sem essa migracao, as colunas `invited_email`, `invitation_status`, `joined_at`, `last_seen_at` e `profiles.email` podem nao existir no banco, e a tela de usuarios nao consegue carregar.

## Variavel de ambiente

Para enviar convites por e-mail, confirme tambem na Vercel:

`SUPABASE_SERVICE_ROLE_KEY`

Ela nao costuma impedir a tela de abrir, mas e necessaria para o botao de convite funcionar.
