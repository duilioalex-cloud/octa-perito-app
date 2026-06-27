-- OCTA Perito v0.9.5 - Modelo de laudo de Engenharia Civil.
-- Adiciona o modelo oficial na Biblioteca Tecnica e no construtor de Laudos.

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'laudo_pericial_engenharia_civil_patologias',
  $title$Laudo Pericial de Engenharia Civil - Vistoria, Patologias e Nexo Tecnico$title$,
  'report',
  'laudo_pericial_engenharia_civil',
  $spec$Engenharia Civil$spec$,
  $desc$Modelo completo para pericias de engenharia civil envolvendo imoveis, obras, vicios construtivos, danos, manifestacoes patologicas, conformidade tecnica e respostas a quesitos.$desc$,
  jsonb_build_object('body', $body$LAUDO PERICIAL DE ENGENHARIA CIVIL

PROCESSO No {{numero_processo}}
JUIZO: {{vara}} - {{comarca}}
AUTOR(A): {{autor}}
REU(RE): {{reu}}
PERITO: {{nome_perito}} - {{registro_profissional}}

1. IDENTIFICACAO E OBJETO DA PERICIA

O presente laudo tecnico pericial foi elaborado em atendimento a nomeacao constante dos autos, com a finalidade de examinar tecnicamente o objeto delimitado pelo Juizo e pelos quesitos admitidos.

Objeto pericial:

{{objeto_pericia}}

Endereco/local da vistoria:

{{endereco_imovel}}

Escopo tecnico:

{{escopo_tecnico}}

2. SINTESE DA CONTROVERSIA TECNICA

De acordo com os elementos disponiveis nos autos, a controvérsia tecnica envolve:

{{sintese_demanda}}

Este laudo restringe-se a analise tecnica de engenharia civil, sem substituir a apreciacao juridica dos fatos, documentos, responsabilidades contratuais ou efeitos processuais, que permanecem sob competencia do Juizo.

3. DOCUMENTOS E ELEMENTOS ANALISADOS

Foram considerados, quando disponiveis e pertinentes:

a) peticao inicial, contestacao, decisoes e demais pecas processuais relevantes;
b) projetos, memoriais, ART/RRT, alvaras, habite-se, contratos e notas fiscais;
c) fotografias, videos, mensagens, relatorios, orcamentos e documentos tecnicos apresentados pelas partes;
d) normas tecnicas aplicaveis ao caso concreto;
e) constatacoes realizadas durante a diligencia pericial.

Documentos efetivamente analisados:

{{documentos_analisados}}

4. DILIGENCIA E CONDICOES DA VISTORIA

A vistoria foi realizada em {{data_vistoria}}, no local {{endereco_imovel}}, com as seguintes presencas:

{{participantes_vistoria}}

Condicoes de acesso e observacoes relevantes:

{{condicoes_vistoria}}

Procedimentos realizados:

{{procedimentos_vistoria}}

A vistoria possui natureza predominantemente visual e nao destrutiva, salvo quando expressamente indicado de modo diverso. Eventuais elementos ocultos, embutidos, inacessiveis ou dependentes de ensaios especificos devem ser analisados conforme a documentacao disponivel e as limitacoes tecnicas registradas.

5. METODOLOGIA E CRITERIOS TECNICOS

A analise tecnica foi conduzida mediante:

a) exame dos autos e dos documentos tecnicos disponibilizados;
b) vistoria do local, com registro fotografico e identificacao das ocorrencias;
c) descricao das manifestacoes patologicas, danos aparentes, desconformidades e condicoes de uso;
d) verificacao de compatibilidade com boas praticas de engenharia, normas tecnicas aplicaveis e regras de manutencao;
e) analise de nexo tecnico entre fatos, causas provaveis e consequencias observadas;
f) elaboracao de conclusoes proporcionais aos elementos tecnicos efetivamente disponiveis.

Normas e referencias tecnicas consideradas, quando aplicaveis:

{{referencias_tecnicas}}

6. CARACTERIZACAO DO IMOVEL, OBRA OU SISTEMA AVALIADO

Tipo de edificacao/obra:

{{tipo_edificacao}}

Uso atual:

{{uso_edificacao}}

Idade aproximada, historico construtivo e intervencoes conhecidas:

{{historico_edificacao}}

Sistemas avaliados:

{{sistemas_avaliados}}

7. CONSTATACOES DE CAMPO

Durante a vistoria foram observadas as seguintes condicoes tecnicas:

{{constatacoes_campo}}

As constatacoes devem ser lidas em conjunto com o registro fotografico, croquis, documentos analisados e demais anexos.

8. ANALISE DAS MANIFESTACOES PATOLOGICAS E DOS DANOS

Para cada manifestacao patologica ou dano relevante, recomenda-se registrar:

a) identificacao do ponto ou ambiente;
b) descricao objetiva da ocorrencia;
c) extensao e intensidade aparente;
d) indicios de evolucao, recorrencia ou agravamento;
e) sistema construtivo afetado;
f) possiveis causas tecnicas;
g) consequencias sobre desempenho, seguranca, uso, habitabilidade ou durabilidade;
h) recomendacao tecnica preliminar.

Analise tecnica:

{{analise_patologias}}

9. NEXO TECNICO E CAUSAS PROVAVEIS

Com base nos elementos disponiveis, as causas provaveis das ocorrencias avaliadas sao:

{{causas_provaveis}}

Nexo tecnico identificado:

{{nexo_tecnico}}

Quando houver concorrencia de fatores, devem ser discriminadas as contribuicoes relacionadas a projeto, execucao, materiais, uso, manutencao, intervencoes posteriores, desgaste natural, eventos externos ou ausencia de documentacao tecnica suficiente.

10. CONFORMIDADE NORMATIVA E BOAS PRATICAS

A avaliacao de conformidade tecnica considera as normas e boas praticas aplicaveis ao periodo, ao sistema avaliado e ao objeto da pericia.

Pontos de conformidade:

{{pontos_conformes}}

Pontos de desconformidade:

{{pontos_desconformes}}

11. MEDIDAS CORRETIVAS E RECOMENDACOES

Recomendam-se, tecnicamente, as seguintes medidas:

{{medidas_recomendadas}}

Quando necessario, a solucao definitiva devera ser precedida de projeto especifico, ensaios complementares, prospeccoes, memoriais, ART/RRT e acompanhamento por profissional habilitado.

12. ESTIMATIVA TECNICA DE CUSTOS E PRAZOS

Estimativa preliminar, quando possivel:

{{estimativa_custos}}

Prazo tecnico estimado:

{{estimativa_prazos}}

Ressalva: a estimativa apresentada neste laudo, quando existente, possui finalidade pericial e deve ser ajustada por orcamento executivo, composicoes atualizadas, quantitativos definitivos e condicoes reais de contratacao.

13. RESPOSTAS AOS QUESITOS

Quesitos do Juizo:

{{quesitos_juizo}}

Respostas:

{{respostas_quesitos_juizo}}

Quesitos das partes:

{{quesitos_partes}}

Respostas:

{{respostas_quesitos_partes}}

14. LIMITACOES E RESSALVAS TECNICAS

Este laudo foi elaborado com base nos documentos disponibilizados, nas constatacoes realizadas na data da vistoria e nos elementos tecnicos acessiveis.

Limitacoes especificas:

{{limitacoes_pericia}}

Nao foram objeto de avaliacao conclusiva os elementos ocultos, inacessiveis, embutidos, dependentes de ensaio destrutivo, laboratorio ou monitoramento continuado, salvo quando expressamente tratados neste laudo.

15. CONCLUSAO TECNICA

Diante dos elementos examinados, conclui-se tecnicamente que:

{{conclusao_tecnica}}

A conclusao decorre dos fatos tecnicos descritos, das analises apresentadas e das limitacoes registradas, permanecendo a apreciacao juridica reservada ao Juizo.

16. ENCERRAMENTO

Nada mais havendo a acrescentar, encerra-se o presente Laudo Pericial de Engenharia Civil.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}

17. ANEXOS

{{anexos}}$body$),
  array[
    'numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional',
    'objeto_pericia','endereco_imovel','escopo_tecnico','sintese_demanda','documentos_analisados',
    'data_vistoria','participantes_vistoria','condicoes_vistoria','procedimentos_vistoria',
    'referencias_tecnicas','tipo_edificacao','uso_edificacao','historico_edificacao','sistemas_avaliados',
    'constatacoes_campo','analise_patologias','causas_provaveis','nexo_tecnico','pontos_conformes',
    'pontos_desconformes','medidas_recomendadas','estimativa_custos','estimativa_prazos',
    'quesitos_juizo','respostas_quesitos_juizo','quesitos_partes','respostas_quesitos_partes',
    'limitacoes_pericia','conclusao_tecnica','cidade_assinatura','data_assinatura',
    'qualificacao_profissional','anexos'
  ]::text[],
  array[
    'ABNT NBR 13752 - Pericias de engenharia na construcao civil, quando aplicavel',
    'ABNT NBR 15575 - Edificacoes habitacionais - Desempenho, quando aplicavel',
    'ABNT NBR 5674 - Manutencao de edificacoes, quando aplicavel',
    'ABNT NBR 14037 - Manual de uso, operacao e manutencao das edificacoes, quando aplicavel',
    'CPC, arts. 464 a 480, conforme o caso'
  ]::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Tecnica OCTA Perito - Engenharia Civil',
  110,
  null
)
on conflict (slug) where slug is not null do update set
  title = excluded.title,
  category = excluded.category,
  document_type = excluded.document_type,
  specialty = excluded.specialty,
  description = excluded.description,
  content = excluded.content,
  variables = excluded.variables,
  legal_basis = excluded.legal_basis,
  is_octa_model = true,
  status = 'active',
  revision_date = current_date,
  source_label = excluded.source_label,
  sort_order = excluded.sort_order;

insert into public.report_types as rt_target (
  organization_id, slug, name, specialty, description,
  is_octa_model, status, version, source_label, created_by
) values (
  null,
  'laudo_engenharia_civil_vistoria_patologias',
  'Laudo Pericial de Engenharia Civil - Vistoria, Patologias e Nexo Tecnico',
  'Engenharia Civil',
  'Estrutura modular para pericias de engenharia civil envolvendo imoveis, obras, vicios construtivos, danos, patologias, conformidade tecnica, custos e respostas a quesitos.',
  true,
  'active',
  1,
  'Biblioteca Tecnica OCTA Perito - Engenharia Civil',
  null
)
on conflict (slug) where organization_id is null do update set
  name = excluded.name,
  specialty = excluded.specialty,
  description = excluded.description,
  is_octa_model = true,
  status = 'active',
  version = greatest(rt_target.version, excluded.version),
  source_label = excluded.source_label;

with rt as (
  select id from public.report_types
  where slug = 'laudo_engenharia_civil_vistoria_patologias'
    and organization_id is null
), seed(section_key, title, description, content_kind, default_content, variables, warnings, sort_order, required, enabled, metadata) as (
  values
    ('identificacao', 'Identificacao do processo', 'Juizo, processo, partes, perito e local examinado.', 'rich_text',
      $s$PROCESSO No {{numero_processo}}
JUIZO: {{vara}} - {{comarca}}
AUTOR(A): {{autor}}
REU(RE): {{reu}}
PERITO: {{nome_perito}} - {{registro_profissional}}
LOCAL EXAMINADO: {{endereco_imovel}}$s$,
      array['numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional','endereco_imovel']::text[],
      array['Conferir a denominacao exata do Juizo, partes e local vistoriado.']::text[], 10, true, true, '{"area":"engenharia_civil"}'::jsonb),
    ('objeto', 'Objeto da pericia', 'Delimitacao objetiva da materia tecnica submetida ao perito.', 'rich_text',
      $s$O presente laudo tem por objeto examinar tecnicamente:

{{objeto_pericia}}

Escopo tecnico admitido:

{{escopo_tecnico}}$s$,
      array['objeto_pericia','escopo_tecnico']::text[],
      array['Nao ampliar o objeto alem da decisao judicial, dos quesitos admitidos e dos elementos tecnicos disponiveis.']::text[], 20, true, true, '{}'::jsonb),
    ('sintese_demanda', 'Sintese da controversia tecnica', 'Resumo tecnico do conflito e dos pontos controvertidos.', 'rich_text',
      $s$A controversia tecnica submetida a exame envolve:

{{sintese_demanda}}

Esta sintese nao substitui a narrativa processual e nao antecipa conclusao juridica.$s$,
      array['sintese_demanda']::text[],
      array['Separar alegacoes das partes, documentos e constatacoes tecnicas.']::text[], 30, false, true, '{}'::jsonb),
    ('documentos', 'Documentos e elementos analisados', 'Fontes documentais utilizadas na analise.', 'sources',
      '',
      '{}'::text[],
      array['Registrar origem, data, pertinencia e eventual limitacao de cada documento.']::text[], 40, true, true, '{}'::jsonb),
    ('diligencia', 'Diligencia e condicoes de vistoria', 'Data, participantes, acesso, condicoes ambientais e procedimentos.', 'rich_text',
      $s$A vistoria foi realizada em {{data_vistoria}}, no local {{endereco_imovel}}.

Participantes:

{{participantes_vistoria}}

Condicoes de acesso e observacoes:

{{condicoes_vistoria}}

Procedimentos executados:

{{procedimentos_vistoria}}$s$,
      array['data_vistoria','endereco_imovel','participantes_vistoria','condicoes_vistoria','procedimentos_vistoria']::text[],
      array['Nao registrar como presente quem nao acompanhou efetivamente a diligencia.','Informar ambientes ou sistemas inacessiveis.']::text[], 50, true, true, '{}'::jsonb),
    ('equipamentos', 'Equipamentos e recursos utilizados', 'Instrumentos, aplicativos, medidores, certificados e rastreabilidade.', 'equipment',
      '',
      '{}'::text[],
      array['Informar certificado e validade de calibracao quando tecnicamente aplicavel.']::text[], 60, false, true, '{}'::jsonb),
    ('metodologia', 'Metodologia e criterios tecnicos', 'Metodo de vistoria, analise documental, criterios normativos e limites.', 'rich_text',
      $s$A metodologia adotada compreendeu exame documental, vistoria tecnica, registro fotografico, analise das manifestacoes observadas, avaliacao de nexo tecnico e verificacao de compatibilidade com normas e boas praticas aplicaveis.

Referencias tecnicas consideradas:

{{referencias_tecnicas}}

Limitacoes metodologicas:

{{limitacoes_metodologia}}$s$,
      array['referencias_tecnicas','limitacoes_metodologia']::text[],
      array['Indicar normas e criterios efetivamente aplicaveis ao caso concreto.','Nao citar norma sem relacao com o objeto pericial.']::text[], 70, true, true, '{}'::jsonb),
    ('caracterizacao', 'Caracterizacao do imovel, obra ou sistema', 'Tipo, uso, idade, historico, sistemas e intervencoes.', 'rich_text',
      $s$Tipo de edificacao/obra: {{tipo_edificacao}}
Uso atual: {{uso_edificacao}}
Idade aproximada e historico: {{historico_edificacao}}

Sistemas avaliados:

{{sistemas_avaliados}}$s$,
      array['tipo_edificacao','uso_edificacao','historico_edificacao','sistemas_avaliados']::text[],
      array['Distinguir dados documentais, informacoes de terceiros e constatacoes de campo.']::text[], 80, false, true, '{}'::jsonb),
    ('constatacoes', 'Constatacoes de campo', 'Descricao objetiva do que foi observado na vistoria.', 'rich_text',
      $s$Durante a vistoria foram observadas as seguintes condicoes tecnicas:

{{constatacoes_campo}}

As constatacoes devem ser vinculadas ao registro fotografico e aos ambientes correspondentes.$s$,
      array['constatacoes_campo']::text[],
      array['Separar fato observado, informacao recebida e inferencia tecnica.']::text[], 90, true, true, '{}'::jsonb),
    ('patologias', 'Manifestacoes patologicas e danos', 'Analise de fissuras, umidade, deformacoes, falhas, danos e desempenho.', 'rich_text',
      $s$As manifestacoes patologicas e danos identificados foram analisados considerando localizacao, extensao, intensidade, evolucao aparente, sistema construtivo afetado, possiveis causas e consequencias tecnicas.

Analise:

{{analise_patologias}}$s$,
      array['analise_patologias']::text[],
      array['Evitar conclusao causal sem evidencias suficientes.','Indicar quando a causa depender de ensaio ou prospeccao complementar.']::text[], 100, true, true, '{}'::jsonb),
    ('nexo_causal', 'Nexo tecnico e causas provaveis', 'Relacao entre fatos, mecanismos de dano e causas tecnicas provaveis.', 'rich_text',
      $s$Causas provaveis:

{{causas_provaveis}}

Nexo tecnico identificado:

{{nexo_tecnico}}

Fatores concorrentes, quando existentes:

{{fatores_concorrentes}}$s$,
      array['causas_provaveis','nexo_tecnico','fatores_concorrentes']::text[],
      array['Diferenciar projeto, execucao, material, uso, manutencao, desgaste natural e eventos externos.']::text[], 110, true, true, '{}'::jsonb),
    ('conformidade_normativa', 'Conformidade normativa e boas praticas', 'Comparacao tecnica com normas, desempenho, manutencao e boas praticas.', 'rich_text',
      $s$Pontos de conformidade:

{{pontos_conformes}}

Pontos de desconformidade:

{{pontos_desconformes}}

Observacoes tecnicas:

{{observacoes_normativas}}$s$,
      array['pontos_conformes','pontos_desconformes','observacoes_normativas']::text[],
      array['Avaliar a norma aplicavel ao periodo, ao sistema e ao escopo da pericia.']::text[], 120, false, true, '{}'::jsonb),
    ('medidas_recomendadas', 'Medidas corretivas e recomendacoes', 'Providencias tecnicas, reparos, ensaios, projetos e acompanhamento.', 'rich_text',
      $s$Recomendam-se as seguintes medidas:

{{medidas_recomendadas}}

Quando necessario, a solucao definitiva devera ser precedida de projeto especifico, ensaios complementares, ART/RRT e acompanhamento por profissional habilitado.$s$,
      array['medidas_recomendadas']::text[],
      array['Distinguir recomendacao preliminar de projeto executivo.']::text[], 130, false, true, '{}'::jsonb),
    ('custos_prazos', 'Estimativa tecnica de custos e prazos', 'Estimativa pericial, ressalvas, quantitativos e limites.', 'rich_text',
      $s$Estimativa preliminar de custos:

{{estimativa_custos}}

Prazo tecnico estimado:

{{estimativa_prazos}}

Ressalva: valores periciais devem ser ajustados por orcamento executivo, quantitativos definitivos e condicoes reais de contratacao.$s$,
      array['estimativa_custos','estimativa_prazos']::text[],
      array['Nao tratar estimativa pericial como contrato ou orcamento executivo definitivo.']::text[], 140, false, true, '{}'::jsonb),
    ('registro_fotografico', 'Registro fotografico', 'Fotos, figuras, croquis, legendas e vinculo com a analise.', 'photos',
      '',
      '{}'::text[],
      array['Toda imagem deve ter legenda, data ou referencia e relacao com o ponto analisado.']::text[], 150, false, true, '{}'::jsonb),
    ('quesitos', 'Respostas aos quesitos', 'Quesitos do Juizo e das partes respondidos individualmente.', 'questions',
      '',
      '{}'::text[],
      array['Responder todos os quesitos; usar nao aplicavel ou prejudicado apenas com justificativa tecnica.']::text[], 160, true, true, '{}'::jsonb),
    ('limitacoes', 'Limitacoes e ressalvas tecnicas', 'Restricoes de acesso, metodologia, documentos, ensaios e elementos ocultos.', 'rich_text',
      $s$Este laudo foi elaborado com base nos documentos disponiveis, nas constatacoes realizadas na data da vistoria e nos elementos tecnicos acessiveis.

Limitacoes especificas:

{{limitacoes_pericia}}$s$,
      array['limitacoes_pericia']::text[],
      array['Registrar limitacoes que possam afetar a extensao ou a certeza da conclusao.']::text[], 170, false, true, '{}'::jsonb),
    ('conclusao', 'Conclusao tecnica', 'Sintese objetiva das respostas tecnicas e do resultado pericial.', 'conclusion',
      $s$Diante dos elementos examinados, conclui-se tecnicamente que:

{{conclusao_tecnica}}

A apreciacao juridica permanece reservada ao Juizo.$s$,
      array['conclusao_tecnica']::text[],
      array['A conclusao deve decorrer dos dados apresentados e permanecer dentro do objeto pericial.','Nao transformar conclusao tecnica em sentenca juridica.']::text[], 180, true, true, '{}'::jsonb),
    ('encerramento', 'Encerramento', 'Fecho, assinatura profissional e referencias a anexos.', 'rich_text',
      $s$Nada mais havendo a acrescentar, encerra-se o presente Laudo Pericial de Engenharia Civil.

{{cidade_assinatura}}, {{data_assinatura}}.

{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$s$,
      array['cidade_assinatura','data_assinatura','nome_perito','qualificacao_profissional','registro_profissional']::text[],
      array['Conferir qualificacao e registro profissional antes da exportacao final.']::text[], 190, true, true, '{}'::jsonb),
    ('anexos', 'Anexos', 'Documentos, registros, certificados, memoriais e arquivos complementares.', 'attachments',
      '',
      '{}'::text[],
      array['Conferir se todos os anexos citados foram efetivamente incluidos.']::text[], 200, false, true, '{}'::jsonb)
)
insert into public.report_section_templates (
  report_type_id, section_key, title, description, content_kind, default_content,
  variables, review_warnings, sort_order, is_required, is_enabled_default, metadata, created_by
)
select rt.id, seed.section_key, seed.title, seed.description, seed.content_kind,
       seed.default_content, seed.variables, seed.warnings, seed.sort_order,
       seed.required, seed.enabled, seed.metadata, null
from rt cross join seed
on conflict (report_type_id, section_key) do update set
  title = excluded.title,
  description = excluded.description,
  content_kind = excluded.content_kind,
  default_content = excluded.default_content,
  variables = excluded.variables,
  review_warnings = excluded.review_warnings,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  is_enabled_default = excluded.is_enabled_default,
  metadata = excluded.metadata;

insert into public.technical_blocks as tb_target (
  organization_id, slug, title, specialty, category, description, content,
  variables, review_warnings, is_octa_model, status, version, source_label, created_by
) values
  (null, 'civil_metodologia_vistoria_nao_destrutiva', 'Metodologia - vistoria visual nao destrutiva', 'Engenharia Civil', 'methodology',
   'Bloco para descrever vistoria de engenharia civil sem ensaios destrutivos.',
   'A vistoria tecnica foi conduzida por inspecao visual, registro fotografico, verificacao dos ambientes acessiveis e confronto com os documentos disponiveis. A metodologia adotada nao compreendeu ensaios destrutivos, prospeccoes invasivas ou monitoramento continuado, salvo quando expressamente indicado no laudo.',
   '{}'::text[],
   array['Informar expressamente quando algum ambiente, sistema ou elemento estava inacessivel.']::text[], true, 'active', 1, 'OCTA Perito - Engenharia Civil', null),
  (null, 'civil_analise_manifestacoes_patologicas', 'Analise de manifestacoes patologicas', 'Engenharia Civil', 'analysis',
   'Bloco para fissuras, umidade, deformacoes, destacamentos, falhas e danos.',
   'As manifestacoes patologicas foram avaliadas considerando localizacao, extensao, intensidade, padrao de ocorrencia, sistema construtivo afetado, historico informado, condicoes de uso e manutencao, possiveis mecanismos de origem e consequencias sobre desempenho, durabilidade, seguranca e habitabilidade.',
   '{}'::text[],
   array['Nao afirmar causa unica quando houver fatores concorrentes possiveis.']::text[], true, 'active', 1, 'OCTA Perito - Engenharia Civil', null),
  (null, 'civil_nexo_tecnico_causas_provaveis', 'Nexo tecnico e causas provaveis', 'Engenharia Civil', 'analysis',
   'Bloco para relacionar danos, mecanismos de falha e causas provaveis.',
   'O nexo tecnico foi avaliado a partir da compatibilidade entre as ocorrencias observadas, os sistemas construtivos envolvidos, o historico documental, as condicoes de uso e manutencao e os mecanismos tecnicos provaveis. Quando identificada concorrencia de fatores, foram discriminadas as hipoteses relacionadas a projeto, execucao, materiais, uso, manutencao, intervencoes posteriores e eventos externos.',
   '{}'::text[],
   array['Distinguir fato constatado, hipotese tecnica e conclusao.']::text[], true, 'active', 1, 'OCTA Perito - Engenharia Civil', null),
  (null, 'civil_limitacao_elementos_ocultos', 'Limitacao - elementos ocultos ou inacessiveis', 'Engenharia Civil', 'limitation',
   'Ressalva para elementos embutidos, ocultos, inacessiveis ou dependentes de ensaio.',
   'Elementos ocultos, embutidos, inacessiveis ou dependentes de ensaios especificos nao puderam ser avaliados de forma direta na vistoria, salvo quando expressamente indicado. As conclusoes sobre tais elementos, quando existentes, baseiam-se nos documentos disponiveis, nos indicios tecnicos observados e nas limitacoes registradas no laudo.',
   '{}'::text[],
   array['Usar esta ressalva quando nao houver ensaio destrutivo ou acesso direto ao elemento analisado.']::text[], true, 'active', 1, 'OCTA Perito - Engenharia Civil', null),
  (null, 'civil_conclusao_tecnica_reservada_juizo', 'Conclusao tecnica com reserva ao Juizo', 'Engenharia Civil', 'conclusion',
   'Fecho para manter conclusao tecnica dentro do escopo pericial.',
   'A conclusao apresentada decorre dos elementos tecnicos examinados, das constatacoes de campo, dos documentos disponiveis e das limitacoes registradas. A apreciacao juridica dos fatos, responsabilidades, culpa, indenizacao ou efeitos processuais permanece reservada ao Juizo.',
   '{}'::text[],
   array['Evitar linguagem de sentenca ou imputacao juridica definitiva.']::text[], true, 'active', 1, 'OCTA Perito - Engenharia Civil', null)
on conflict (slug) where organization_id is null do update set
  title = excluded.title,
  specialty = excluded.specialty,
  category = excluded.category,
  description = excluded.description,
  content = excluded.content,
  variables = excluded.variables,
  review_warnings = excluded.review_warnings,
  is_octa_model = true,
  status = 'active',
  version = greatest(tb_target.version, excluded.version),
  source_label = excluded.source_label;
