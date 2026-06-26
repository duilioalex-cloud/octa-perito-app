# OCTA Perito v0.6.3 — Hotfix de instalação na Vercel

## Diagnóstico

O erro não está no código do módulo de honorários. A instalação das dependências está falhando dentro do npm com `Exit handler never called!`. Em consequência, o Next.js não é instalado completamente e o build termina com `next: command not found`.

## Correção aplicada

- substituição do npm pelo pnpm no deploy;
- Node.js 22.x;
- pnpm 10.15.1 fixado em `packageManager`;
- instalação explícita com `pnpm install --no-frozen-lockfile`;
- compilação explícita com `pnpm run build`;
- nenhuma alteração no banco de dados.

## Instalação

Envie todos os arquivos do pacote para a raiz do repositório e substitua os existentes.

Mensagem de commit sugerida:

`Troca instalação da Vercel para pnpm v0.6.3`

No novo log, deve aparecer `pnpm install`, e não `npm ci` ou `npm install`.

Se o deploy reutilizar configuração antiga, abra o deploy, clique em **Redeploy** e desative **Use existing Build Cache**.
