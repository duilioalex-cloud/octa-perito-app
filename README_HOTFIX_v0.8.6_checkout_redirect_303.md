# OCTA Perito v0.8.6 - Hotfix checkout Abacate Pay

## O que corrige

O formulario de teste e o futuro site de vendas enviam um POST para criar a sessao de checkout.
O redirecionamento para a Abacate Pay precisa responder com HTTP 303 para o navegador abrir a pagina de pagamento como GET.

Sem este ajuste, alguns navegadores podem tentar repetir o POST diretamente na URL de checkout da Abacate Pay e a tela de pagamento nao abre corretamente.

## Arquivo para subir no GitHub

Substitua este arquivo no repositorio:

```text
app/api/billing/abacatepay/checkout/route.ts
```

## Depois de subir

1. Commit na branch `main`.
2. Aguardar o deploy da Vercel ficar pronto.
3. Abrir novamente:

```text
outputs/TESTAR_CHECKOUT_ABACATEPAY_OCTA_PERITO.html
```

4. Preencher o formulario e clicar em `Abrir checkout oficial`.

## SQL

Nao precisa rodar SQL novo.
