# OCTA Perito v0.6.1 — Hotfix de instalação na Vercel

Este pacote corrige a falha ocorrida antes da compilação:

`npm error Exit handler never called!`

Ajustes:

- fixa Node.js 22.x;
- fixa npm 10.9.2;
- usa `npm ci` na Vercel;
- usa cache npm isolado e limpo em `/tmp`;
- mantém todas as funcionalidades da v0.6.

Não há nova migração SQL.

Após enviar os arquivos ao GitHub, aguarde o deploy automático. Caso reutilize o deploy com erro, faça o redeploy sem marcar **Use existing Build Cache**.
