-- OCTA Perito v0.9.12 - Modelo de Laudo de Seguranca do Trabalho.
-- Modelo anonimizado e consolidado para pericias de insalubridade e periculosidade.

delete from public.report_section_templates
where report_type_id in (
  select id
  from public.report_types
  where slug = 'laudo_seguranca_trabalho_insalubridade_periculosidade'
    and organization_id is null
);

delete from public.report_types
where slug = 'laudo_seguranca_trabalho_insalubridade_periculosidade'
  and organization_id is null;

delete from public.templates
where slug = 'laudo_seguranca_trabalho_insalubridade_periculosidade'
  and organization_id is null;

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'laudo_seguranca_trabalho_insalubridade_periculosidade',
  $title$Laudo Tecnico Pericial - Insalubridade e Periculosidade$title$,
  'report',
  'laudo_seguranca_trabalho_insalubridade_periculosidade',
  $spec$Engenharia de Seguranca do Trabalho$spec$,
  $desc$Modelo completo para pericias trabalhistas e civeis de insalubridade e periculosidade, com diligencia, atividades, EPI/EPC, NR-15, NR-16, quesitos, conclusao tecnica e referencias normativas.$desc$,
  jsonb_build_object('body', $body$LAUDO TECNICO PERICIAL - INSALUBRIDADE E PERICULOSIDADE

PROCESSO No {{numero_processo}}
JUIZO: {{vara}} - {{comarca}}
AUTOR(A): {{autor}}
REU(RE): {{reu}}
PERITO: {{nome_perito}} - {{registro_profissional}}
DATA DO LAUDO: {{data_laudo}}

1. APRESENTACAO

O presente Laudo Tecnico Pericial foi elaborado em atendimento a nomeacao constante dos autos, com a finalidade de apurar, sob criterio tecnico, a existencia ou inexistencia de condicoes de insalubridade e/ou periculosidade nas atividades exercidas pela parte analisada.

O trabalho foi desenvolvido com base nos documentos constantes dos autos, nas informacoes colhidas em diligencia, nas atividades efetivamente descritas, nas condicoes ambientais observadas, nos quesitos apresentados e nas normas tecnicas e legais aplicaveis.

2. OBJETO DA PERICIA

Objeto pericial:

{{objeto_pericia}}

Periodo contratual ou periodo analisado:

{{periodo_analisado}}

Funcao/cargo analisado:

{{cargo_funcao}}

Setor/local de trabalho:

{{local_trabalho}}

Pontos controvertidos:

{{pontos_controvertidos}}

3. FUNDAMENTACAO LEGAL E TECNICA

Foram considerados, conforme pertinencia ao caso concreto:

a) CLT, especialmente arts. 189 a 197, quando aplicaveis;
b) NR-01, quanto ao gerenciamento de riscos ocupacionais e documentacao de SST;
c) NR-06, quanto a fornecimento, adequacao, registro, uso, conservacao e treinamento de EPI;
d) NR-09, quanto a avaliacao e controle das exposicoes ocupacionais;
e) NR-15 e seus anexos, para caracterizacao de insalubridade;
f) NR-16 e seus anexos, para caracterizacao de periculosidade;
g) normas de higiene ocupacional da Fundacentro, quando aplicaveis ao agente avaliado;
h) documentos tecnicos apresentados pelas partes, como PGR, PPRA, LTCAT, PCMSO, PPP, fichas de EPI, ordens de servico, laudos anteriores e registros de treinamento.

Referencias complementares adotadas:

{{referencias_complementares}}

4. DOCUMENTOS E ELEMENTOS ANALISADOS

Foram examinados, quando disponiveis:

{{documentos_analisados}}

Observacoes sobre documentos ausentes, incompletos ou divergentes:

{{limitacoes_documentais}}

5. SINTESE DAS ALEGACOES DAS PARTES

Sintese da peticao inicial:

{{sintese_inicial}}

Sintese da defesa/contestacao:

{{sintese_defesa}}

Observacao tecnica: a sintese acima nao substitui a leitura dos autos e serve apenas para delimitar os pontos tecnicos examinados neste laudo.

6. DILIGENCIA PERICIAL

Data e horario da diligencia:

{{data_vistoria}}

Local vistoriado:

{{local_vistoriado}}

Presentes na diligencia:

{{participantes_vistoria}}

Procedimentos realizados:

{{procedimentos_vistoria}}

Condicoes de acesso, colaboracao e limitacoes:

{{condicoes_vistoria}}

7. CARACTERIZACAO DO LOCAL E DO PROCESSO DE TRABALHO

Descricao do ambiente de trabalho:

{{descricao_ambiente}}

Caracteristicas fisicas do local:

{{caracteristicas_local}}

Jornada, frequencia e rotina laboral:

{{jornada_rotina}}

Descricao detalhada das atividades executadas:

{{descricao_atividades}}

Equipamentos, maquinas, ferramentas, produtos ou fontes de risco utilizados:

{{equipamentos_produtos_fontes}}

8. METODOLOGIA DE AVALIACAO

A avaliacao foi conduzida por criterio qualitativo e/ou quantitativo, conforme o agente analisado e a exigencia normativa aplicavel.

Metodologia adotada:

{{metodologia_avaliacao}}

Instrumentos utilizados, quando houver avaliacao quantitativa:

{{instrumentos_utilizados}}

Certificados de calibracao, quando aplicavel:

{{certificados_calibracao}}

Criterios de exposicao considerados:

{{criterios_exposicao}}

9. EPI, EPC E MEDIDAS ADMINISTRATIVAS

Equipamentos de Protecao Individual informados ou comprovados:

{{epis_fornecidos}}

Comprovantes de entrega, CA, treinamento, troca e fiscalizacao:

{{comprovacao_epi}}

Equipamentos de Protecao Coletiva e medidas de engenharia:

{{epcs_medidas_coletivas}}

Medidas administrativas e organizacionais:

{{medidas_administrativas}}

Analise tecnica de eficacia:

{{analise_eficacia_protecao}}

10. ANALISE DE INSALUBRIDADE - NR-15

A caracterizacao da insalubridade depende da existencia de exposicao a agente previsto na NR-15, observados os criterios qualitativos ou quantitativos de cada anexo, a intensidade/concentracao do agente, tempo de exposicao, habitualidade, permanencia, neutralizacao ou eliminacao por medidas de protecao e demais elementos do caso concreto.

10.1 Agentes fisicos

Ruido:

{{analise_ruido}}

Calor:

{{analise_calor}}

Frio, umidade, pressoes anormais, vibracao ou radiacoes:

{{analise_outros_agentes_fisicos}}

10.2 Agentes quimicos

Produtos, substancias ou compostos avaliados:

{{produtos_quimicos_avaliados}}

Forma de exposicao, vias de absorcao e frequencia:

{{exposicao_quimicos}}

Analise conforme NR-15 e anexos aplicaveis:

{{analise_quimicos}}

10.3 Agentes biologicos

Atividades com potencial contato com agentes biologicos:

{{atividades_agentes_biologicos}}

Material, pacientes, animais, residuos, objetos ou superficies potencialmente contaminados:

{{fontes_biologicas}}

Analise conforme NR-15, Anexo 14:

{{analise_biologicos}}

10.4 Resumo da insalubridade

Agentes avaliados:

{{resumo_agentes_insalubridade}}

Conclusao quanto a insalubridade:

{{conclusao_insalubridade}}

Grau, quando caracterizado:

{{grau_insalubridade}}

11. ANALISE DE PERICULOSIDADE - NR-16

A caracterizacao da periculosidade depende do enquadramento da atividade ou operacao nas hipoteses previstas na NR-16 e seus anexos, observando area de risco, permanencia, habitualidade, condicoes operacionais e efetiva exposicao ao risco acentuado.

11.1 Inflamaveis

{{analise_inflamaveis}}

11.2 Explosivos

{{analise_explosivos}}

11.3 Energia eletrica

{{analise_eletricidade}}

11.4 Seguranca pessoal ou patrimonial

{{analise_seguranca_pessoal_patrimonial}}

11.5 Motocicleta

{{analise_motocicleta}}

11.6 Radiacoes ionizantes, quando pertinente

{{analise_radiacoes_ionizantes}}

11.7 Resumo da periculosidade

Agentes ou operacoes perigosas avaliadas:

{{resumo_agentes_periculosidade}}

Conclusao quanto a periculosidade:

{{conclusao_periculosidade}}

12. QUADRO RESUMO TECNICO

Funcoes e atividades avaliadas:

{{quadro_funcoes_atividades}}

Agentes insalubres identificados:

{{quadro_insalubridade}}

Operacoes perigosas identificadas:

{{quadro_periculosidade}}

EPI/EPC e eficacia:

{{quadro_protecao}}

Conclusao resumida:

{{quadro_conclusao}}

13. REGISTRO FOTOGRAFICO

Inserir fotografias, croquis, mapas, certificados, fichas, documentos ou registros tecnicos, com legenda e vinculacao ao ponto analisado.

{{registro_fotografico}}

14. RESPOSTAS AOS QUESITOS

Quesitos do Juizo:

{{quesitos_juizo}}

Quesitos da parte autora:

{{quesitos_autor}}

Quesitos da parte re:

{{quesitos_reu}}

15. LIMITACOES E RESSALVAS TECNICAS

{{limitacoes_ressalvas}}

16. CONCLUSAO TECNICA

Diante dos documentos examinados, das informacoes colhidas, da diligencia realizada, da metodologia aplicada e dos criterios normativos pertinentes, conclui-se tecnicamente que:

Quanto a insalubridade:

{{conclusao_final_insalubridade}}

Quanto a periculosidade:

{{conclusao_final_periculosidade}}

Conclusao geral:

{{conclusao_tecnica}}

A apreciacao juridica dos fatos, do direito aplicavel e dos efeitos processuais permanece reservada ao Juizo.

17. ENCERRAMENTO

Nada mais havendo a acrescentar, encerra-se o presente Laudo Tecnico Pericial.

{{cidade_assinatura}}, {{data_assinatura}}.

{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}

18. ANEXOS

{{anexos}}$body$),
  array[
    'numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional','data_laudo',
    'objeto_pericia','periodo_analisado','cargo_funcao','local_trabalho','pontos_controvertidos',
    'referencias_complementares','documentos_analisados','limitacoes_documentais','sintese_inicial','sintese_defesa',
    'data_vistoria','local_vistoriado','participantes_vistoria','procedimentos_vistoria','condicoes_vistoria',
    'descricao_ambiente','caracteristicas_local','jornada_rotina','descricao_atividades','equipamentos_produtos_fontes',
    'metodologia_avaliacao','instrumentos_utilizados','certificados_calibracao','criterios_exposicao',
    'epis_fornecidos','comprovacao_epi','epcs_medidas_coletivas','medidas_administrativas','analise_eficacia_protecao',
    'analise_ruido','analise_calor','analise_outros_agentes_fisicos','produtos_quimicos_avaliados','exposicao_quimicos','analise_quimicos',
    'atividades_agentes_biologicos','fontes_biologicas','analise_biologicos','resumo_agentes_insalubridade','conclusao_insalubridade','grau_insalubridade',
    'analise_inflamaveis','analise_explosivos','analise_eletricidade','analise_seguranca_pessoal_patrimonial','analise_motocicleta','analise_radiacoes_ionizantes',
    'resumo_agentes_periculosidade','conclusao_periculosidade','quadro_funcoes_atividades','quadro_insalubridade','quadro_periculosidade','quadro_protecao','quadro_conclusao',
    'registro_fotografico','quesitos_juizo','quesitos_autor','quesitos_reu','limitacoes_ressalvas',
    'conclusao_final_insalubridade','conclusao_final_periculosidade','conclusao_tecnica','cidade_assinatura','data_assinatura','qualificacao_profissional','anexos'
  ]::text[],
  array[
    'CLT, arts. 189 a 197',
    'NR-01 - Disposicoes Gerais e Gerenciamento de Riscos Ocupacionais',
    'NR-06 - Equipamento de Protecao Individual',
    'NR-09 - Avaliacao e controle das exposicoes ocupacionais',
    'NR-15 - Atividades e Operacoes Insalubres',
    'NR-16 - Atividades e Operacoes Perigosas',
    'Normas de Higiene Ocupacional da Fundacentro, quando aplicaveis',
    'CPC, arts. 464, 466 e 473, quando aplicavel'
  ]::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Tecnica OCTA Perito - Seguranca do Trabalho',
  130,
  null
);

insert into public.report_types as rt_target (
  organization_id, slug, name, specialty, description,
  is_octa_model, status, version, source_label, created_by
) values (
  null,
  'laudo_seguranca_trabalho_insalubridade_periculosidade',
  'Laudo Tecnico Pericial - Insalubridade e Periculosidade',
  'Engenharia de Seguranca do Trabalho',
  'Estrutura modular para pericias de seguranca do trabalho envolvendo atividades, ambiente, EPI/EPC, NR-15, NR-16, quesitos e conclusao tecnica.',
  true,
  'active',
  1,
  'Biblioteca Tecnica OCTA Perito - Seguranca do Trabalho',
  null
);

with rt as (
  select id from public.report_types
  where slug = 'laudo_seguranca_trabalho_insalubridade_periculosidade'
    and organization_id is null
), seed(section_key, title, description, content_kind, default_content, variables, warnings, sort_order, required, enabled, metadata) as (
  values
    ('identificacao', 'Identificacao do processo', 'Juizo, processo, partes, perito e dados basicos.', 'rich_text',
      $s$PROCESSO No {{numero_processo}}
JUIZO: {{vara}} - {{comarca}}
AUTOR(A): {{autor}}
REU(RE): {{reu}}
PERITO: {{nome_perito}} - {{registro_profissional}}
DATA DO LAUDO: {{data_laudo}}$s$,
      array['numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional','data_laudo']::text[],
      array['Conferir partes, numero do processo, Juizo e qualificacao profissional.']::text[], 10, true, true, '{"area":"seguranca_trabalho"}'::jsonb),
    ('objeto', 'Objeto e periodo analisado', 'Delimitacao tecnica da pericia.', 'rich_text',
      $s$Objeto da pericia:

{{objeto_pericia}}

Periodo analisado: {{periodo_analisado}}
Cargo/funcao: {{cargo_funcao}}
Local/setor de trabalho: {{local_trabalho}}

Pontos controvertidos:

{{pontos_controvertidos}}$s$,
      array['objeto_pericia','periodo_analisado','cargo_funcao','local_trabalho','pontos_controvertidos']::text[],
      array['Nao ampliar o objeto alem dos pontos tecnicos admitidos nos autos.']::text[], 20, true, true, '{}'::jsonb),
    ('fundamentacao', 'Fundamentacao legal e tecnica', 'CLT, NRs, NHO e documentos de SST.', 'rich_text',
      $s$Foram consideradas as normas e referencias aplicaveis ao caso concreto, especialmente CLT, NR-01, NR-06, NR-09, NR-15, NR-16 e NHO/Fundacentro quando pertinentes.

Referencias complementares:

{{referencias_complementares}}$s$,
      array['referencias_complementares']::text[],
      array['Atualizar referencias quando houver alteracao normativa aplicavel ao agente examinado.']::text[], 30, true, true, '{}'::jsonb),
    ('documentos', 'Documentos analisados', 'Autos, PGR, PPRA, LTCAT, PPP, PCMSO, fichas de EPI e registros.', 'sources',
      '',
      '{}'::text[],
      array['Registrar documentos ausentes ou insuficientes para evitar conclusoes sem suporte.']::text[], 40, false, true, '{}'::jsonb),
    ('alegacoes', 'Sintese das alegacoes das partes', 'Resumo tecnico da inicial e da defesa.', 'rich_text',
      $s$Sintese da inicial:

{{sintese_inicial}}

Sintese da defesa:

{{sintese_defesa}}$s$,
      array['sintese_inicial','sintese_defesa']::text[],
      array['Separar alegacao de fato constatado.']::text[], 50, false, true, '{}'::jsonb),
    ('diligencia', 'Diligencia pericial', 'Data, local, participantes e procedimentos.', 'rich_text',
      $s$Data e horario: {{data_vistoria}}
Local: {{local_vistoriado}}
Presentes: {{participantes_vistoria}}

Procedimentos realizados:

{{procedimentos_vistoria}}

Condicoes e limitacoes:

{{condicoes_vistoria}}$s$,
      array['data_vistoria','local_vistoriado','participantes_vistoria','procedimentos_vistoria','condicoes_vistoria']::text[],
      array['Registrar quando o local atual nao reproduz as condicoes do periodo contratual.']::text[], 60, true, true, '{}'::jsonb),
    ('atividade', 'Local, rotina e atividades', 'Caracterizacao do ambiente e do trabalho executado.', 'rich_text',
      $s$Descricao do ambiente:

{{descricao_ambiente}}

Caracteristicas do local:

{{caracteristicas_local}}

Jornada e rotina:

{{jornada_rotina}}

Atividades executadas:

{{descricao_atividades}}

Equipamentos, produtos e fontes de risco:

{{equipamentos_produtos_fontes}}$s$,
      array['descricao_ambiente','caracteristicas_local','jornada_rotina','descricao_atividades','equipamentos_produtos_fontes']::text[],
      array['A conclusao deve se apoiar nas atividades efetivas, nao apenas no nome do cargo.']::text[], 70, true, true, '{}'::jsonb),
    ('metodologia', 'Metodologia de avaliacao', 'Criterios qualitativos, quantitativos e instrumentos.', 'rich_text',
      $s$Metodologia adotada:

{{metodologia_avaliacao}}

Instrumentos utilizados:

{{instrumentos_utilizados}}

Certificados de calibracao:

{{certificados_calibracao}}

Criterios de exposicao:

{{criterios_exposicao}}$s$,
      array['metodologia_avaliacao','instrumentos_utilizados','certificados_calibracao','criterios_exposicao']::text[],
      array['Distinguir avaliacao qualitativa de quantitativa e citar o criterio normativo aplicavel.']::text[], 80, true, true, '{}'::jsonb),
    ('epi_epc', 'EPI, EPC e medidas de controle', 'Fornecimento, CA, treinamento, uso efetivo e eficacia.', 'rich_text',
      $s$EPI informados/comprovados:

{{epis_fornecidos}}

Comprovacao de entrega, CA, treinamento, troca e fiscalizacao:

{{comprovacao_epi}}

EPC e medidas de engenharia:

{{epcs_medidas_coletivas}}

Medidas administrativas:

{{medidas_administrativas}}

Analise de eficacia:

{{analise_eficacia_protecao}}$s$,
      array['epis_fornecidos','comprovacao_epi','epcs_medidas_coletivas','medidas_administrativas','analise_eficacia_protecao']::text[],
      array['Nao considerar EPI eficaz sem analisar adequacao, CA, treinamento, troca, uso e fiscalizacao.']::text[], 90, true, true, '{}'::jsonb),
    ('insalubridade', 'Analise de insalubridade - NR-15', 'Agentes fisicos, quimicos, biologicos e resumo.', 'rich_text',
      $s$Ruido:

{{analise_ruido}}

Calor:

{{analise_calor}}

Outros agentes fisicos:

{{analise_outros_agentes_fisicos}}

Produtos quimicos avaliados:

{{produtos_quimicos_avaliados}}

Exposicao a agentes quimicos:

{{exposicao_quimicos}}

Analise de agentes quimicos:

{{analise_quimicos}}

Atividades com agentes biologicos:

{{atividades_agentes_biologicos}}

Fontes biologicas:

{{fontes_biologicas}}

Analise de agentes biologicos:

{{analise_biologicos}}

Resumo:

{{resumo_agentes_insalubridade}}

Conclusao quanto a insalubridade: {{conclusao_insalubridade}}
Grau: {{grau_insalubridade}}$s$,
      array['analise_ruido','analise_calor','analise_outros_agentes_fisicos','produtos_quimicos_avaliados','exposicao_quimicos','analise_quimicos','atividades_agentes_biologicos','fontes_biologicas','analise_biologicos','resumo_agentes_insalubridade','conclusao_insalubridade','grau_insalubridade']::text[],
      array['Caracterizar somente quando houver enquadramento na NR-15 e suporte tecnico suficiente.']::text[], 100, true, true, '{}'::jsonb),
    ('periculosidade', 'Analise de periculosidade - NR-16', 'Inflamaveis, explosivos, eletricidade, seguranca, motocicleta e radiacoes.', 'rich_text',
      $s$Inflamaveis:

{{analise_inflamaveis}}

Explosivos:

{{analise_explosivos}}

Energia eletrica:

{{analise_eletricidade}}

Seguranca pessoal ou patrimonial:

{{analise_seguranca_pessoal_patrimonial}}

Motocicleta:

{{analise_motocicleta}}

Radiacoes ionizantes, quando pertinente:

{{analise_radiacoes_ionizantes}}

Resumo:

{{resumo_agentes_periculosidade}}

Conclusao quanto a periculosidade:

{{conclusao_periculosidade}}$s$,
      array['analise_inflamaveis','analise_explosivos','analise_eletricidade','analise_seguranca_pessoal_patrimonial','analise_motocicleta','analise_radiacoes_ionizantes','resumo_agentes_periculosidade','conclusao_periculosidade']::text[],
      array['Verificar area de risco, habitualidade, permanencia e enquadramento expresso na NR-16.']::text[], 110, true, true, '{}'::jsonb),
    ('quadro_resumo', 'Quadro resumo tecnico', 'Resumo de atividades, agentes, protecao e conclusao.', 'rich_text',
      $s$Funcoes e atividades:

{{quadro_funcoes_atividades}}

Insalubridade:

{{quadro_insalubridade}}

Periculosidade:

{{quadro_periculosidade}}

Protecao:

{{quadro_protecao}}

Conclusao resumida:

{{quadro_conclusao}}$s$,
      array['quadro_funcoes_atividades','quadro_insalubridade','quadro_periculosidade','quadro_protecao','quadro_conclusao']::text[],
      array['Conferir coerencia entre quadro resumo, analise e conclusao final.']::text[], 120, false, true, '{}'::jsonb),
    ('registro_fotografico', 'Registro fotografico', 'Fotos, croquis, documentos e legendas.', 'photos',
      '',
      '{}'::text[],
      array['Toda foto deve ter legenda e relacao com a analise tecnica.']::text[], 130, false, true, '{}'::jsonb),
    ('quesitos', 'Respostas aos quesitos', 'Quesitos do Juizo e das partes.', 'questions',
      '',
      '{}'::text[],
      array['Responder todos os quesitos individualmente; usar prejudicado ou nao aplicavel com justificativa.']::text[], 140, true, true, '{}'::jsonb),
    ('limitacoes', 'Limitacoes e ressalvas tecnicas', 'Restricoes de documentos, acesso, periodo ou medicao.', 'rich_text',
      $s$Limitacoes e ressalvas:

{{limitacoes_ressalvas}}$s$,
      array['limitacoes_ressalvas']::text[],
      array['Registrar limitacoes que possam alterar a certeza ou a extensao da conclusao.']::text[], 150, false, true, '{}'::jsonb),
    ('conclusao', 'Conclusao tecnica', 'Conclusao sobre insalubridade e periculosidade.', 'conclusion',
      $s$Quanto a insalubridade:

{{conclusao_final_insalubridade}}

Quanto a periculosidade:

{{conclusao_final_periculosidade}}

Conclusao geral:

{{conclusao_tecnica}}

A apreciacao juridica permanece reservada ao Juizo.$s$,
      array['conclusao_final_insalubridade','conclusao_final_periculosidade','conclusao_tecnica']::text[],
      array['A conclusao deve decorrer da analise tecnica e evitar linguagem de sentenca.']::text[], 160, true, true, '{}'::jsonb),
    ('encerramento', 'Encerramento', 'Fecho, local, data e assinatura profissional.', 'rich_text',
      $s$Nada mais havendo a acrescentar, encerra-se o presente Laudo Tecnico Pericial.

{{cidade_assinatura}}, {{data_assinatura}}.

{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$s$,
      array['cidade_assinatura','data_assinatura','nome_perito','qualificacao_profissional','registro_profissional']::text[],
      array['Conferir registro profissional e qualificacao antes da exportacao final.']::text[], 170, true, true, '{}'::jsonb),
    ('anexos', 'Anexos', 'Fotos, documentos, certificados, medicoes, fichas e memorias.', 'attachments',
      '',
      '{}'::text[],
      array['Conferir se todos os anexos citados foram efetivamente incluidos.']::text[], 180, false, true, '{}'::jsonb)
)
insert into public.report_section_templates (
  report_type_id, section_key, title, description, content_kind, default_content,
  variables, review_warnings, sort_order, is_required, is_enabled_default, metadata, created_by
)
select rt.id, seed.section_key, seed.title, seed.description, seed.content_kind,
       seed.default_content, seed.variables, seed.warnings, seed.sort_order,
       seed.required, seed.enabled, seed.metadata, null
from rt cross join seed;

delete from public.technical_blocks
where organization_id is null
  and slug in (
    'sst_metodologia_insalubridade_nr15',
    'sst_metodologia_periculosidade_nr16',
    'sst_epi_epc_eficacia',
    'sst_agentes_biologicos_anexo14',
    'sst_conclusao_dupla_insalubridade_periculosidade'
  );

insert into public.technical_blocks (
  organization_id, slug, title, specialty, category, description, content,
  variables, review_warnings, is_octa_model, status, version, source_label, created_by
) values
  (null, 'sst_metodologia_insalubridade_nr15', 'Metodologia - analise de insalubridade NR-15', 'Engenharia de Seguranca do Trabalho', 'methodology',
   'Bloco para explicar criterio qualitativo e quantitativo de insalubridade.',
   'A analise de insalubridade foi conduzida com base na NR-15 e respectivos anexos, observando a natureza do agente, intensidade ou concentracao, tempo de exposicao, habitualidade, permanencia, vias de exposicao, existencia de medidas de protecao coletiva, fornecimento e eficacia de EPI, documentos tecnicos disponiveis e constatacoes realizadas em diligencia.',
   '{}'::text[],
   array['Indicar o anexo da NR-15 correspondente ao agente analisado.']::text[], true, 'active', 1, 'OCTA Perito - Seguranca do Trabalho', null),
  (null, 'sst_metodologia_periculosidade_nr16', 'Metodologia - analise de periculosidade NR-16', 'Engenharia de Seguranca do Trabalho', 'methodology',
   'Bloco para explicar enquadramento de operacoes perigosas.',
   'A analise de periculosidade foi realizada a partir do enquadramento da atividade ou operacao nas hipoteses previstas na NR-16 e anexos aplicaveis, considerando area de risco, fontes perigosas, forma de exposicao, permanencia, habitualidade, condicoes reais de trabalho, medidas de controle e limites tecnicos da vistoria.',
   '{}'::text[],
   array['Nao caracterizar periculosidade sem demonstrar enquadramento normativo e exposicao ao risco acentuado.']::text[], true, 'active', 1, 'OCTA Perito - Seguranca do Trabalho', null),
  (null, 'sst_epi_epc_eficacia', 'Analise de eficacia de EPI e EPC', 'Engenharia de Seguranca do Trabalho', 'analysis',
   'Bloco para avaliar EPI, EPC, CA, treinamento, troca, uso e fiscalizacao.',
   'A eficacia das medidas de protecao foi analisada considerando adequacao ao risco, comprovacao de fornecimento, Certificado de Aprovacao quando aplicavel, treinamento, orientacao, higienizacao, substituicao, uso efetivo, fiscalizacao, medidas coletivas existentes e sua capacidade de eliminar, neutralizar ou reduzir a exposicao ao agente avaliado.',
   '{}'::text[],
   array['EPI informado verbalmente nao equivale automaticamente a neutralizacao do agente.']::text[], true, 'active', 1, 'OCTA Perito - Seguranca do Trabalho', null),
  (null, 'sst_agentes_biologicos_anexo14', 'Agentes biologicos - NR-15 Anexo 14', 'Engenharia de Seguranca do Trabalho', 'analysis',
   'Bloco para atividades com pacientes, material infectocontagiante, residuos ou ambientes de saude.',
   'Para agentes biologicos, a analise deve verificar se a atividade se enquadra nas hipoteses descritas no Anexo 14 da NR-15, avaliando contato permanente com pacientes, animais, material infectocontagiante, residuos, objetos de uso de pacientes nao previamente esterilizados, bem como a natureza da atividade, frequencia, protecoes existentes e efetivo risco ocupacional.',
   '{}'::text[],
   array['Distinguir atendimento administrativo ao publico de contato ocupacional enquadravel no Anexo 14.']::text[], true, 'active', 1, 'OCTA Perito - Seguranca do Trabalho', null),
  (null, 'sst_conclusao_dupla_insalubridade_periculosidade', 'Conclusao - insalubridade e periculosidade', 'Engenharia de Seguranca do Trabalho', 'conclusion',
   'Bloco para fechar conclusao dupla sem invadir materia juridica.',
   'Com base nos documentos analisados, nas informacoes colhidas, na diligencia realizada e nos criterios normativos aplicaveis, conclui-se tecnicamente quanto a insalubridade: {{conclusao_final_insalubridade}}. Quanto a periculosidade: {{conclusao_final_periculosidade}}. A apreciacao juridica dos reflexos da prova tecnica permanece reservada ao Juizo.',
   array['conclusao_final_insalubridade','conclusao_final_periculosidade']::text[],
   array['Separar claramente conclusao de insalubridade e conclusao de periculosidade.']::text[], true, 'active', 1, 'OCTA Perito - Seguranca do Trabalho', null);
