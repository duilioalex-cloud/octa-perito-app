# OCTA Perito v0.9.4 - Admin: acesso e senha do cliente

## O que muda

- Adiciona no painel admin o botao **Enviar link de senha** na lista de clientes.
- Adiciona no painel admin o botao **Enviar senha** nas compras ja provisionadas.
- Adiciona campo **Senha temporaria** com botao **Alterar senha** para definir uma senha direta pelo admin.
- Ao alterar senha temporaria, o e-mail do usuario tambem e confirmado no Supabase para permitir login.
- Registra eventos administrativos em `subscription_events`.

## Arquivos para subir no GitHub

Suba exatamente estes arquivos, mantendo estes caminhos:

```text
app/actions/admin.ts
app/(app)/admin/page.tsx
app/globals.css
```

## Precisa rodar SQL?

Nao.

## Precisa criar variavel nova na Vercel?

Nao.

## Como usar

1. Abra:

```text
https://octa-perito-app.vercel.app/admin
```

2. Em **Clientes e assinaturas**, use:

```text
Enviar link de senha
```

para o cliente receber o e-mail de definicao de senha.

3. Se quiser resolver na hora, digite uma senha com pelo menos 8 caracteres em:

```text
Senha temporaria
```

e clique em:

```text
Alterar senha
```

Depois envie essa senha temporaria para o cliente por WhatsApp/e-mail e peça para ele trocar depois.

## Depois de subir

Faça commit na `main` e aguarde a Vercel ficar `Ready / Production`.
