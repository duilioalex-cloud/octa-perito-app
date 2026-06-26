# OCTA Perito v0.5 — Identidade Profissional e Exportação Premium

A versão 0.5 transforma os laudos e documentos gerados em arquivos profissionais, personalizados e prontos para revisão final.

## Funcionalidades entregues

### Identidade profissional por organização

Em **Configurações → Identidade profissional**, proprietários e administradores podem cadastrar:

- nome do escritório ou empresa;
- nome e títulos do profissional responsável;
- conselho e registro profissional;
- cidade/UF de emissão;
- linha de contato;
- texto do cabeçalho;
- texto do rodapé;
- cores institucionais;
- logomarca em PNG ou JPG;
- assinatura em PNG ou JPG.

Os arquivos de marca permanecem em bucket privado no Supabase.

### Exportação Word profissional

Os laudos exportados em `.docx` passam a incluir:

- capa configurável;
- sumário gerado automaticamente a partir dos capítulos ativos;
- cabeçalho e rodapé personalizados;
- paginação;
- quadro de identificação processual;
- capítulos estruturados;
- quesitos e respostas;
- fontes analisadas;
- equipamentos e calibrações;
- fotografias incorporadas;
- legendas, local e data das imagens;
- assinatura técnica e identificação profissional.

As petições e manifestações permanecem sem capa, mas recebem cabeçalho, rodapé, identidade visual, paginação e assinatura.

### Exportação PDF

Foi adicionada exportação direta em PDF para:

- laudos periciais;
- petições e documentos gerados.

O PDF contém identidade visual, paginação, sumário, fotografias incorporadas e assinatura.

### Tratamento das imagens

As fotografias são redimensionadas e otimizadas durante a exportação para evitar arquivos excessivamente grandes. São aceitas imagens JPEG, PNG e WebP nos anexos; o sistema normaliza o formato quando necessário.

## Migração obrigatória

Execute no **Supabase SQL Editor**:

```text
supabase/migrations/006_document_identity.sql
```

A migração cria:

- tabela `organization_document_settings`;
- bucket privado `branding-files`;
- políticas RLS de leitura por membros;
- políticas de gravação e exclusão para proprietário/administrador.

A migração é idempotente e não apaga processos, laudos, documentos ou anexos existentes.

## Ordem de implantação

1. executar `006_document_identity.sql` no Supabase;
2. enviar todo o conteúdo desta versão ao GitHub;
3. aguardar o deploy da Vercel;
4. abrir **Configurações**;
5. cadastrar identidade, logomarca e assinatura;
6. abrir um laudo e testar **Exportar Word** e **Exportar PDF**.

## Teste funcional recomendado

1. cadastrar logomarca e assinatura em PNG;
2. definir cores, cabeçalho e rodapé;
3. abrir um laudo com fotografia anexada;
4. exportar em Word;
5. conferir capa, sumário, paginação, fotografia e assinatura;
6. exportar em PDF;
7. abrir uma petição e conferir a exportação sem capa;
8. alterar uma opção de exportação e testar novamente.

## Validações de desenvolvimento

```text
npx tsc --noEmit    ✓
npm run lint        ✓
npm run build       ✓
```

Também foram gerados arquivos Word e PDF de teste com imagens incorporadas, renderizados e verificados visualmente.

## Observação técnica

A exportação não substitui a revisão profissional. Conteúdo, medições, conclusões, referências normativas, identificação das partes e anexos devem ser integralmente conferidos antes da assinatura ou do protocolo.
