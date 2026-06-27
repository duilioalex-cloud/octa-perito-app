# OCTA Perito v0.9.1 - hotfix checkout anual

## Problema corrigido

O checkout anual retornava:

```text
Property 'items' is missing
```

A Abacate Pay exige `items` no checkout. Esta versao corrige o envio do anual para usar `items: [{ id, quantity }]`.

## Arquivos para subir no GitHub

Mantenha exatamente estes caminhos:

```text
.env.example
app/api/billing/abacatepay/checkout/route.ts
lib/abacatepay.ts
```

## Variavel obrigatoria nova

Crie o produto anual na Abacate Pay e coloque o ID dele na Vercel:

```env
ABACATEPAY_ANNUAL_PRODUCT_ID=prod_anual_xxxxxxxxxxxxxxxxx
```

## Produto anual na Abacate Pay

Crie como produto avulso/pagamento unico, nao como assinatura.

Nome:

```text
OCTA Perito Anual
```

Preco:

```text
1798,80
```

Depois copie o ID `prod_...` do produto anual.

## Depois

1. Suba estes arquivos no GitHub.
2. Adicione `ABACATEPAY_ANNUAL_PRODUCT_ID` na Vercel.
3. Clique em `Redeploy`.
4. Teste novamente selecionando o plano anual.
