# OCTA Perito v0.6.4 — Hotfix Bun para Vercel

## Diagnóstico

Os deploys com npm e pnpm falharam antes do build, durante a consulta ao registro npm, com `ERR_INVALID_THIS` / `ERR_PNPM_META_FETCH_FAIL`. O aplicativo não chegou a compilar na Vercel.

## Alteração

- mantém Node.js 22.x;
- remove a seleção do pnpm;
- usa Bun apenas para instalar dependências e executar o build;
- mantém o Next.js e o runtime do aplicativo;
- autoriza a instalação do pacote nativo `sharp`;
- não altera banco, Supabase ou dados.

## Arquivos principais

- `package.json`
- `vercel.json`
- remoção de `.npmrc`

## Instalação

1. Substitua `package.json` e `vercel.json` na raiz do repositório.
2. Exclua o arquivo `.npmrc` da raiz do repositório.
3. Faça commit com a mensagem: `Troca instalação da Vercel para Bun v0.6.4`.
4. Na Vercel, faça o novo deploy sem reutilizar o Build Cache.

## Log esperado

```text
Running "install" command: bun install
bun run build
```

Não execute nova migração SQL.
