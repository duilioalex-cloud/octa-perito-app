# OCTA Perito v0.9.3 - Pos-compra e acesso do cliente

## O que muda

- A pagina `/compra/sucesso` agora consulta a compra pelo `session`.
- Mostra status, plano, valor, e-mail de acesso e escritorio do comprador.
- Quando o escritorio ja estiver liberado, aparece o botao **Enviar link para definir senha**.
- O comprador tambem pode abrir **Definir senha manualmente** com o e-mail ja preenchido.
- O formulario de recuperacao de senha agora aceita e-mail pre-preenchido e pode voltar para a pagina de sucesso com mensagem.

## Arquivos para subir no GitHub

Suba exatamente estes arquivos, mantendo estes caminhos:

```text
app/actions/auth.ts
app/compra/sucesso/page.tsx
app/(auth)/recuperar-senha/page.tsx
app/globals.css
```

## Precisa rodar SQL?

Nao.

## Precisa criar variavel nova na Vercel?

Nao.

## Depois de subir

1. Faça commit direto na branch `main`.
2. Aguarde o deploy da Vercel ficar `Ready / Production`.
3. Teste um checkout e confira a tela:

```text
https://octa-perito-app.vercel.app/compra/sucesso?session=ID_DA_COMPRA
```

## Observacao

Se o pagamento acabou de ser aprovado e o botao de senha ainda nao apareceu, clique em **Atualizar status** depois de alguns segundos. O webhook da Abacate Pay pode levar um pequeno intervalo para provisionar o escritorio.
