# OCTA Perito v0.4.1

Atualização incremental da interface do Construtor de Laudos.

## Alterações

- botão **Excluir laudo** na tela do construtor;
- confirmação explícita antes da exclusão;
- exclusão em cascata de capítulos, quesitos, fontes, equipamentos, versões e metadados de anexos;
- limpeza dos arquivos vinculados no bucket `report-files`;
- mensagem de confirmação após a exclusão;
- contraste reforçado em todos os campos de seleção;
- opções de listas com fundo escuro e texto mais legível;
- versão do aplicativo atualizada para `0.4.1`.

## Instalação

Não há nova migração SQL. Substitua os arquivos do repositório pelos deste pacote e aguarde o deploy automático da Vercel.

## Teste

1. Abra um laudo de teste.
2. Confirme que os seletores estão mais escuros e legíveis.
3. Clique em **Excluir laudo**.
4. Cancele a primeira confirmação para verificar a proteção.
5. Repita e confirme a exclusão.
6. Verifique se o laudo desapareceu da listagem e do processo.
