# OCTA Perito v0.6.2 — Hotfix Vercel

Este hotfix altera o runtime de build para Node.js 20.x e remove a exigência de uma versão exata do npm.

## Motivo

O deploy anterior falhou durante `npm ci` com `Exit handler never called!`, erro interno do npm observado no ambiente Node.js 22.x / npm 10.9.7 da Vercel.

## Arquivos alterados

- `package.json`
- `package-lock.json`
- `vercel.json`
- `.npmrc`

## Instalação

1. Substitua os arquivos do repositório pelos arquivos deste pacote.
2. Faça commit na branch `main`.
3. Na Vercel, faça um redeploy sem reutilizar o Build Cache.
4. Não execute nova migração SQL.

## Resultado esperado

A Vercel deverá usar Node.js 20.x e executar `npm ci --no-audit --no-fund`.
