# OCTA Perito v0.9.2 - Admin: cancelar e excluir testes

## O que muda

- Adiciona o botao **Cancelar teste** nas compras recentes que ainda nao foram provisionadas.
- Adiciona o botao **Excluir compra** para remover compras de teste que nao criaram cliente.
- Adiciona o botao **Excluir cliente teste** na lista de clientes e assinaturas.
- Ao clicar em **Processar pago**, o admin volta para a pagina com cache desativado e parametro novo, forçando a atualizacao automatica da tela.

## Arquivos para subir no GitHub

Suba exatamente estes arquivos, mantendo estes caminhos:

```text
app/actions/admin.ts
app/(app)/admin/page.tsx
app/globals.css
```

## Precisa rodar SQL?

Nao. Esta atualizacao usa tabelas e status que ja existem.

## Depois de subir

1. Faça commit direto na branch `main`.
2. Aguarde o deploy da Vercel ficar `Ready / Production`.
3. Abra:

```text
https://octa-perito-app.vercel.app/admin
```

## Como usar no admin

- **Processar pago**: libera a compra como paga e atualiza a pagina automaticamente.
- **Cancelar teste**: marca o checkout como cancelado, sem criar cliente.
- **Excluir compra**: remove uma compra de teste que ainda nao criou cliente.
- **Excluir cliente teste**: remove o escritorio de teste e seus registros de cobranca vinculados. Use somente para cadastros de teste.
