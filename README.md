# OCTA Perito v0.5

Plataforma profissional para gestão de processos periciais, geração de petições e construção modular de laudos.

## Módulos atuais

- dashboard e gestão de processos;
- prazos e honorários;
- biblioteca técnica;
- gerador de petições;
- construtor de laudos Ambientais e SST/Previdenciários;
- quesitos, fontes, equipamentos e anexos;
- histórico de versões;
- exclusão controlada de processos e laudos;
- identidade profissional por organização;
- exportação premium em Word e PDF;
- fotografias incorporadas aos laudos;
- cabeçalho, rodapé, paginação, logomarca e assinatura.

## Migrações

Execute as migrações na ordem numérica. Para atualizar da v0.4.2 para a v0.5, execute apenas:

```text
supabase/migrations/006_document_identity.sql
```

Consulte:

- `README_V0.5.md`;
- `README_MIGRACAO_006.md`.

## Instalação

```bash
npm install
npx tsc --noEmit
npm run lint
npm run build
```

Node.js: `22.x`.

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

## Segurança documental

O sistema não inventa informações técnicas e não substitui a revisão do profissional emitente. Os arquivos de identidade e os anexos dos laudos são armazenados em buckets privados, com controle de acesso por organização.
