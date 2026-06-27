# OCTA Perito v0.9.5 - Modelo de Laudo de Engenharia Civil

## O que este pacote adiciona

Este pacote adiciona o modelo oficial:

**Laudo Pericial de Engenharia Civil - Vistoria, Patologias e Nexo Tecnico**

Ele entra em dois pontos do sistema:

- Biblioteca tecnica: como modelo OCTA de categoria `Laudos`.
- Novo laudo: como tipo de laudo modular para o construtor de laudos.

Tambem adiciona blocos tecnicos reutilizaveis de engenharia civil.

## Arquivo para subir no GitHub

Suba este arquivo exatamente neste caminho do repositorio:

```text
supabase/migrations/013_civil_engineering_report_model.sql
```

Arquivo dentro deste pacote:

```text
supabase/migrations/013_civil_engineering_report_model.sql
```

## SQL para rodar no Supabase

Para aparecer agora no sistema em producao, rode o mesmo SQL no Supabase:

```text
outputs/SUPABASE_RODAR_MODELO_LAUDO_ENGENHARIA_CIVIL.sql
```

Passo a passo:

1. Abra o Supabase.
2. Va em `SQL Editor`.
3. Cole todo o conteudo do arquivo SQL.
4. Clique em `Run`.
5. Abra o OCTA Perito.
6. Entre em `Biblioteca tecnica`.
7. Filtre por `Laudos` ou pesquise por `Engenharia Civil`.
8. Confira se apareceu o modelo.
9. Entre em `Laudos > Novo laudo`.
10. Confira se apareceu o tipo de laudo de Engenharia Civil.

## Importante

Rodar o SQL duas vezes nao deve duplicar o modelo, porque ele usa `slug` e `on conflict`.

Este pacote nao exige redeploy da Vercel para o modelo aparecer no banco. O redeploy so e util para manter o repositorio e o historico alinhados.
