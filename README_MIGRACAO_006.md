# Migração 006 — Identidade documental

## Caminho

No Supabase:

```text
Projeto octa-perito
→ SQL Editor
→ New query
```

1. desative a tradução automática do navegador;
2. abra `supabase/migrations/006_document_identity.sql`;
3. copie todo o conteúdo;
4. cole na nova consulta;
5. clique em **Run**.

Resultado esperado:

```text
Success. No rows returned
```

## Conferência

Depois, execute:

```sql
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'organization_document_settings';

select id, name, public, file_size_limit
from storage.buckets
where id = 'branding-files';
```

Deve aparecer:

- tabela `organization_document_settings`;
- bucket `branding-files`;
- bucket privado (`public = false`);
- limite de 5 MB.
