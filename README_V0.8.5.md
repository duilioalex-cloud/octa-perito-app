# OCTA Perito v0.8.5 - Fluxo vendavel com Abacate Pay

Esta versao prepara o OCTA Perito para vender o produto por checkout externo.

## Ordem de publicacao

1. Rode no Supabase o arquivo `SUPABASE_RODAR_012_abacatepay_sales_flow.sql`.
2. Depois suba os arquivos do pacote `GITHUB_SUBIR_v0.8.5_abacatepay_sales_flow.zip` no GitHub.
3. Configure as variaveis de ambiente na Vercel.
4. Configure o webhook na Abacate Pay.

## Variaveis de ambiente

```env
ABACATEPAY_API_KEY=apk_live_xxxxxxxxxxxxxxxxx
ABACATEPAY_PRODUCT_ID=prod_xxxxxxxxxxxxxxxxx
ABACATEPAY_PLAN_CODE=octa-perito-mensal
ABACATEPAY_AMOUNT_CENTS=0
ABACATEPAY_PAYMENT_METHODS=CARD
ABACATEPAY_RETURN_URL=https://seu-site-de-vendas.com
ABACATEPAY_WEBHOOK_SECRET=troque-por-um-segredo-forte
ABACATEPAY_WEBHOOK_HMAC_KEY=chave-hmac-do-webhook
BILLING_ALLOWED_ORIGIN=*
```

## Endpoint para o site de vendas

O site de vendas deve chamar:

```txt
POST https://SEU_APP.vercel.app/api/billing/abacatepay/checkout
```

Campos aceitos em JSON ou formulario:

```json
{
  "buyerName": "Nome do comprador",
  "buyerEmail": "email@cliente.com",
  "buyerPhone": "11999999999",
  "buyerDocument": "CPF ou CNPJ",
  "organizationName": "Nome do escritorio",
  "organizationDocument": "CNPJ do escritorio",
  "returnUrl": "https://seu-site-de-vendas.com",
  "redirect": true
}
```

Se `redirect=true`, o comprador e enviado direto para o checkout. Sem redirect, a API retorna:

```json
{
  "sessionId": "...",
  "checkoutUrl": "https://..."
}
```

## Webhook da Abacate Pay

Configure na Abacate Pay:

```txt
https://SEU_APP.vercel.app/api/webhooks/abacatepay?webhookSecret=SEU_ABACATEPAY_WEBHOOK_SECRET
```

Quando o pagamento for confirmado, o app:

- registra a compra em `sales_checkout_sessions`;
- cria ou convida o usuario comprador;
- cria o escritorio;
- vincula o comprador como proprietario;
- ativa a assinatura;
- mostra a compra no painel `/admin`.

Eventos de falha deixam a assinatura como vencida. Eventos de cancelamento, estorno ou disputa perdida bloqueiam o escritorio.

## O que ainda falta para fechar a venda completa

- Ligar o formulario real do site de vendas nesse endpoint.
- Criar o produto/plano dentro da Abacate Pay e colocar o `ABACATEPAY_PRODUCT_ID` na Vercel.
- Testar uma compra real de baixo valor antes da publicacao comercial.
