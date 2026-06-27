# OCTA Perito v0.8.4 - Painel administrativo SaaS

Esta versao cria a base para vender o OCTA Perito como produto SaaS.

## Ordem de publicacao

1. Rode no Supabase o arquivo `SUPABASE_RODAR_011_saas_admin_billing.sql`.
2. Depois suba os arquivos do pacote `GITHUB_SUBIR_v0.8.4_painel_admin_saas.zip` no GitHub.
3. Aguarde o deploy da Vercel.

## O que foi adicionado

- Area `/admin` visivel somente para administradores da plataforma.
- Cadastro seguro de `platform_admins` no banco.
- Status de assinatura por escritorio: teste, ativo, vencido, bloqueado e cancelado.
- Tela de bloqueio quando a assinatura do escritorio estiver bloqueada.
- Estrutura inicial para Abacate Pay: clientes, assinaturas, pagamentos e eventos.

## Administrador inicial

A migracao ja tenta liberar o e-mail `duilioalex@gmail.com` como administrador da plataforma, quando esse usuario existir no Supabase Auth.

Se precisar liberar outro e-mail, rode no SQL Editor:

```sql
insert into public.platform_admins (user_id, created_by)
select id, id
from auth.users
where lower(email) = lower('SEU_EMAIL_AQUI')
on conflict (user_id) do nothing;
```

## Observacao importante

O painel administrativo controla o acesso do cliente ao produto. Ele nao altera as permissoes internas ja configuradas: perito continua vendo financeiro, e assistente/consulta continuam sem financeiro.
