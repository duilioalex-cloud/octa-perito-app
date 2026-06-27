# OCTA Perito v0.8.7 - Hotfix rotas publicas de checkout

## O que corrige

O checkout da Abacate Pay estava chamando:

```text
/api/billing/abacatepay/checkout
```

mas o middleware de login estava protegendo essa rota e devolvendo a tela de login no lugar da API.
Por isso o teste mostrava `Failed to fetch`.

## Rotas liberadas publicamente

Estas rotas precisam ser publicas para o produto vendavel funcionar:

```text
/api/billing/abacatepay/checkout
/api/webhooks/abacatepay
/compra/sucesso
```

O restante do sistema continua protegido por login.

## Arquivo para subir no GitHub

Substitua este arquivo no repositorio:

```text
lib/supabase/proxy.ts
```

## Depois de subir

1. Commit na branch `main`.
2. Aguarde o deploy da Vercel ficar `Ready / Production`.
3. Abra o teste:

```text
outputs/teste-checkout-octa.html
```

4. Clique em `Criar checkout e abrir pagamento`.

## SQL

Nao precisa rodar SQL novo.
