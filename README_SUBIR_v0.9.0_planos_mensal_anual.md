# OCTA Perito v0.9.0 - planos mensal e anual

## O que mudou

- O endpoint de checkout agora aceita `plan=monthly` e `plan=annual`.
- `monthly` cria assinatura recorrente na Abacate Pay via `subscriptions/create`.
- `annual` cria checkout avulso via `checkouts/create`, com `card.maxInstallments=12`.
- Compra anual provisionada libera 12 meses de acesso no OCTA Perito.
- O card de receita mensal do Admin SaaS considera plano anual dividido por 12.
- A pagina local de teste foi atualizada para escolher mensal ou anual.

## Arquivos para subir no GitHub

Suba os arquivos mantendo estes caminhos:

```text
.env.example
app/(app)/admin/page.tsx
app/api/billing/abacatepay/checkout/route.ts
lib/abacatepay.ts
lib/billing-provisioning.ts
```

## Variaveis da Vercel

Para mensal real:

```env
ABACATEPAY_PRODUCT_ID=prod_mensal_xxxxxxxxxxxxxxxxx
ABACATEPAY_PLAN_CODE=octa-perito-mensal
ABACATEPAY_AMOUNT_CENTS=29700
ABACATEPAY_MONTHLY_PRODUCT_ID=prod_mensal_xxxxxxxxxxxxxxxxx
ABACATEPAY_MONTHLY_PLAN_CODE=octa-perito-mensal
ABACATEPAY_MONTHLY_AMOUNT_CENTS=29700
```

Para anual real:

```env
ABACATEPAY_ANNUAL_PLAN_CODE=octa-perito-anual
ABACATEPAY_ANNUAL_AMOUNT_CENTS=179880
ABACATEPAY_ANNUAL_MAX_INSTALLMENTS=12
ABACATEPAY_ANNUAL_ACCESS_MONTHS=12
ABACATEPAY_ANNUAL_PRODUCT_NAME=OCTA Perito Anual
ABACATEPAY_ANNUAL_PRODUCT_DESCRIPTION=Acesso anual ao OCTA Perito com parcelamento em ate 12x.
```

Opcional:

```env
ABACATEPAY_ANNUAL_PRODUCT_ID=
```

O anual nao precisa obrigatoriamente de produto cadastrado por ID, porque o checkout avulso envia nome, descricao e preco do produto. Se voce criar um produto anual na Abacate Pay e quiser referenciar, preencha `ABACATEPAY_ANNUAL_PRODUCT_ID`.

## Depois de subir

1. Aguarde o deploy da Vercel ficar `Ready / Production`.
2. Abra `outputs/TESTAR_CHECKOUT_ABACATEPAY_OCTA_PERITO.html`.
3. Escolha `Mensal` ou `Anual`.
4. Preencha comprador e escritorio.
5. Clique em `Criar checkout e abrir pagamento`.
6. Depois do pagamento, confira `/admin` no OCTA Perito.

## Webhook

Mantenha o webhook v2 da Abacate Pay apontando para:

```text
https://octa-perito-app.vercel.app/api/webhooks/abacatepay
```

Eventos recomendados:

```text
checkout.completed
checkout.refunded
checkout.lost
checkout.disputed
subscription.completed
subscription.renewed
subscription.cancelled
subscription.payment_failed
```

## Banco de dados

Nao precisa rodar SQL novo para esta versao. Ela usa as tabelas criadas nas migracoes 011 e 012.
