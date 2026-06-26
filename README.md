# OCTA Perito v0.4.2 — Construtor de Laudos

Aplicação profissional para gestão de processos periciais, geração de petições e elaboração modular de laudos.

## Entregas principais

- módulo **Laudos** no menu principal;
- criação de laudo vinculado a processo;
- modelos-piloto Ambiental e SST/Previdenciário;
- geração automática de capítulos pela migração 004;
- ativação, desativação e ordenação de capítulos;
- edição individual e status de revisão por capítulo;
- inserção de blocos técnicos reutilizáveis;
- cadastro, edição e exclusão de quesitos;
- cadastro de documentos e fontes analisadas;
- cadastro de equipamentos e calibração;
- upload privado de fotografias e anexos;
- histórico por snapshots completos;
- exportação do conteúdo estruturado em Word;
- integração dos laudos à página do processo.

## Migrações

Execute no Supabase SQL Editor, nesta ordem:

1. `supabase/migrations/004_report_builder.sql` — já executada quando o banco da v0.4 foi criado;
2. `supabase/migrations/005_report_storage.sql` — cria o bucket privado `report-files` e as políticas de acesso.

Desative a tradução automática do navegador antes de executar os scripts.

## Instalação

```bash
npm install
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

## Teste funcional recomendado

1. abrir **Laudos**;
2. criar um laudo para um processo existente;
3. editar e salvar um capítulo;
4. inserir um bloco técnico;
5. cadastrar um quesito e sua resposta;
6. cadastrar uma fonte e um equipamento;
7. executar a migração 005 e enviar uma fotografia;
8. registrar uma versão;
9. exportar o arquivo Word.

## Segurança documental

O sistema não substitui a revisão profissional. Campos incompletos, fundamentação, medições, conclusões, referências normativas e anexos devem ser conferidos antes da assinatura ou protocolo.


## Atualização v0.4.2

Consulte `README_V0.4.2.md` para os ajustes de exclusão de laudos/processos e correção global dos menus suspensos.
