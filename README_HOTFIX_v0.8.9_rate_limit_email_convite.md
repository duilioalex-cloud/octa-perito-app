# OCTA Perito v0.8.9 - Provisionamento mesmo com limite de e-mail

## O que corrige

Ao clicar em `Processar pago`, o Supabase pode retornar:

```text
email rate limit exceeded
```

Antes, isso interrompia todo o provisionamento. Agora o sistema:

1. tenta enviar o convite por e-mail;
2. se o limite de e-mail bloquear o convite, cria o usuario mesmo assim com senha temporaria;
3. libera o escritorio e associa o comprador como proprietario;
4. mostra no painel admin que houve erro de envio de e-mail.

Depois, o cliente pode usar `Recuperar senha` quando o limite liberar ou quando houver SMTP proprio configurado.

## Arquivos para subir no GitHub

Substitua estes arquivos no repositorio:

```text
app/(app)/admin/page.tsx
lib/billing-provisioning.ts
```

## Depois de subir

1. Commit na branch `main`.
2. Aguarde o deploy da Vercel ficar `Ready / Production`.
3. Abra:

```text
https://octa-perito-app.vercel.app/admin
```

4. Clique novamente em `Processar pago` na compra de R$ 1,00.
5. A compra deve virar `Provisionado`.

## SQL

Nao precisa rodar SQL novo.
