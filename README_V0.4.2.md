# OCTA Perito v0.4.2

Atualização corretiva de usabilidade e exclusão de registros.

## Alterações

- botão **Excluir** visível em cada laudo cadastrado na listagem de laudos;
- botão **Excluir laudo** mantido dentro do construtor;
- botão **Excluir** visível em cada processo cadastrado;
- botão **Excluir processo** na tela de detalhes do processo;
- exclusão de processo com remoção em cascata de prazos, histórico, petições, laudos e versões;
- limpeza dos anexos dos laudos no bucket privado `report-files`;
- confirmação obrigatória antes de qualquer exclusão definitiva;
- remoção do botão redundante **Biblioteca técnica** no cabeçalho de Laudos, pois o acesso já existe no menu lateral;
- reforço global do tema escuro para campos `select`, `option` e `optgroup`;
- texto branco e fundo escuro nas opções dos menus suspensos em todo o sistema;
- meta `color-scheme: dark` adicionada para melhorar a renderização nativa no Chrome e no Windows.

## Permissões

A exclusão de processos e laudos fica disponível somente para usuários com função `owner` ou `admin`.

## Migração

Não há nova migração SQL. As políticas atuais já permitem a exclusão administrativa e os relacionamentos existentes utilizam exclusão em cascata.

## Atualização

1. Extraia o pacote.
2. Envie todos os arquivos para o repositório `octa-perito-app`, substituindo os existentes.
3. Confirme o commit na branch principal.
4. Aguarde o deploy automático da Vercel.

Mensagem sugerida de commit:

```text
Corrige exclusão de laudos e processos e melhora menus suspensos
```

## Teste funcional

1. Abra **Laudos** e confirme o botão vermelho **Excluir** ao lado de cada registro.
2. Abra um laudo e confirme o botão **Excluir laudo** no cabeçalho.
3. Abra **Processos** e confirme o botão **Excluir** ao lado de cada processo.
4. Abra um processo e confirme o botão **Excluir processo** no cabeçalho.
5. Abra campos de status, tipo, prioridade e revisão e confira o menu com fundo escuro e texto branco.
6. Faça os testes de exclusão somente com registros de teste.
