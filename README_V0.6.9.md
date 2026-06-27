# OCTA Perito v0.6.9 — Hotfix visual do painel

Esta versão corrige o painel financeiro e operacional publicado sem os estilos específicos do dashboard.

## Diagnóstico

A página e os dados estavam sendo carregados, mas a camada CSS da versão 0.6.8 não estava chegando corretamente ao navegador no deploy. O efeito era a concatenação de textos, ausência dos grids e gráficos sem dimensionamento.

## Correção aplicada

- estilos do dashboard isolados em `app/dashboard.css`;
- importação explícita do arquivo após `globals.css` no layout raiz;
- preservação integral das consultas, cálculos, Supabase e banco de dados;
- nenhuma nova migração SQL;
- manutenção da configuração Bun já validada na Vercel.

## Publicação

1. Envie todo o conteúdo deste pacote para a raiz do repositório.
2. Substitua os arquivos existentes.
3. Confirme que `app/dashboard.css` foi incluído no commit.
4. Faça o deploy sem reutilizar o Build Cache da Vercel.
5. Após o deploy, atualize a página com `Ctrl + F5`.

Mensagem sugerida de commit:

```text
Corrige carregamento visual do painel v0.6.9
```

## Validação

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

O pacote não deve conter `package-lock.json`, `.npmrc`, `node_modules` ou `.next`.
