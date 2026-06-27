# OCTA Perito v0.8.8 - Webhook mais robusto e reprocessamento manual

## O que corrige

Quando o checkout da Abacate Pay e o pagamento funcionam, mas a compra continua como `CHECKOUT CRIADO`, o problema esta no recebimento/processamento do webhook.

Esta versao faz duas melhorias:

1. O webhook passa a procurar a compra tambem por URL de checkout e e-mail do comprador, alem dos IDs principais.
2. O painel administrativo ganha o botao `Processar pago` nas compras recentes, para liberar manualmente uma compra paga que ficou presa.

Tambem foi adicionada a secao `Eventos recentes` no painel admin para acompanhar webhooks e acoes manuais.

## Arquivos para subir no GitHub

Substitua estes arquivos no repositorio:

```text
app/(app)/admin/page.tsx
app/actions/admin.ts
lib/billing-provisioning.ts
```

## Depois de subir

1. Commit na branch `main`.
2. Aguarde o deploy da Vercel ficar `Ready / Production`.
3. Abra:

```text
https://octa-perito-app.vercel.app/admin
```

4. Na compra de R$ 1,00 que ja foi paga, clique em `Processar pago`.
5. A compra deve virar `Provisionado` e o cliente deve aparecer como ativo.

## SQL

Nao precisa rodar SQL novo.
