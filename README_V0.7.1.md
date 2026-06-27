# OCTA Perito v0.7.1 — Hotfix do layout do painel

## Correção principal

A faixa de indicadores operacionais estava sendo exibida como texto contínuo porque o stylesheet específico do painel não estava chegando de forma confiável ao deploy.

A versão 0.7.1:

- consolida os estilos do dashboard em `app/globals.css`;
- elimina a dependência do arquivo separado `app/dashboard.css`;
- mantém cada indicador operacional em card independente;
- organiza os indicadores em grid responsivo de 4, 3, 2 ou 1 coluna;
- preserva os cálculos, filtros e consultas ao Supabase;
- não exige migração SQL.

## Indicadores corrigidos

- Processos ativos;
- Diligências ativas;
- Laudos em andamento;
- Prazos próximos;
- Prazos vencidos;
- Pendências financeiras;
- Processos sem movimentação há 30 dias.

## Publicação

1. Substitua os arquivos do repositório pelo conteúdo deste pacote.
2. Faça commit e push.
3. Na Vercel, execute um novo deploy sem reutilizar o cache de build.
4. Após a publicação, atualize o navegador com `Ctrl + F5`.

## Banco de dados

Não executar migração SQL.
