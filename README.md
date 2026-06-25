# OCTA Perito App — MVP 0.1

Primeiro núcleo funcional do sistema OCTA Perito.

## Entregue nesta versão

- autenticação Supabase por e-mail e senha;
- confirmação de e-mail e recuperação de senha;
- cadastro do escritório profissional;
- arquitetura multiusuário com RLS;
- dashboard protegido;
- cadastro e listagem de processos;
- tela de detalhes da perícia;
- bases visuais da Biblioteca Técnica, Honorários e Configurações;
- endpoint de saúde em `/api/health`.

## Stack validada em junho de 2026

- Next.js 16.2.9;
- React 19.2.7;
- Supabase JS 2.108.2;
- Supabase SSR 0.12.0.

## 1. Criar o repositório

Crie no GitHub um repositório privado chamado `octa-perito-app` e envie todo o conteúdo desta pasta.

## 2. Executar o banco

No Supabase do OCTA Perito:

1. abra **SQL Editor**;
2. abra `supabase/migrations/001_initial_schema.sql`;
3. copie todo o conteúdo;
4. clique em **Run**.

A migração cria perfis, organizações, membros, processos, modelos e políticas RLS.

## 3. Variáveis na Vercel

Crie um novo projeto Vercel importando o repositório `octa-perito-app` e configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jbtljwvjmoihuppkgivk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICAVEL_DO_SUPABASE
NEXT_PUBLIC_SITE_URL=https://app.octaperito.com.br
```

Use a chave **Publishable** do Supabase. Não utilize `service_role` ou `secret` no navegador.

## 4. Configuração do Supabase Auth

Em **Authentication > URL Configuration**:

- Site URL: `https://app.octaperito.com.br`
- Redirect URLs:
  - `https://app.octaperito.com.br/auth/callback`
  - `http://localhost:3000/auth/callback`

Mantenha confirmação de e-mail ativada para produção.

## 5. Implantar

A Vercel detectará Next.js automaticamente. Não altere o build command.

## 6. Domínio

No projeto Vercel, adicione `app.octaperito.com.br`. Na Cloudflare, crie o CNAME indicado pela Vercel e mantenha inicialmente como **Somente DNS**.

## 7. Teste operacional

1. acesse `/cadastro`;
2. crie uma conta;
3. confirme o e-mail;
4. cadastre o escritório;
5. cadastre a primeira perícia;
6. confira o dashboard.

## Próxima versão

- editor da Biblioteca Técnica;
- campos dinâmicos;
- modelos de petições;
- calculadora real de honorários;
- prazos e tarefas;
- armazenamento de arquivos.
