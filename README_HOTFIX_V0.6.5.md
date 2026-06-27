# OCTA Perito v0.6.5 — correção do travamento na migração do lockfile

O travamento ocorre porque o arquivo `package-lock.json` ainda permanece na raiz do repositório. Ao iniciar, o Bun tenta convertê-lo para `bun.lock` e o deploy fica parado em:

```
migrated lockfile from package-lock.json
```

## Passos obrigatórios

1. No GitHub, abra a raiz do repositório `octa-perito-app`.
2. Abra o arquivo `package-lock.json`.
3. Clique em `...` e escolha **Delete file**.
4. Confirme o commit.
5. Faça upload, na raiz do repositório, destes arquivos:
   - `package.json`
   - `vercel.json`
   - `bunfig.toml`
6. Confirme o commit.
7. Na Vercel, execute um novo deploy sem reutilizar o Build Cache.

## Resultado esperado

O log não deve mais mostrar a conversão de `package-lock.json`. Deve seguir de `bun install` para a resolução das dependências e depois para `bun run build`.
