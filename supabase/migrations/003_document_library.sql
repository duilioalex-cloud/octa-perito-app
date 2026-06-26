-- OCTA Perito v0.3 — biblioteca técnica, modelos e gerador de documentos

alter table public.templates add column if not exists slug text;
alter table public.templates add column if not exists document_type text;
alter table public.templates add column if not exists description text;
alter table public.templates add column if not exists variables text[] not null default '{}'::text[];
alter table public.templates add column if not exists legal_basis text[] not null default '{}'::text[];
alter table public.templates add column if not exists revision_date date;
alter table public.templates add column if not exists source_label text;
alter table public.templates add column if not exists sort_order integer not null default 0;
alter table public.templates add column if not exists duplicated_from uuid references public.templates(id) on delete set null;

create unique index if not exists templates_slug_unique on public.templates (slug) where slug is not null;
create index if not exists templates_library_idx on public.templates (is_octa_model, status, category, specialty, sort_order);

create table if not exists public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  version integer not null,
  title text not null,
  content jsonb not null,
  variables text[] not null default '{}'::text[],
  legal_basis text[] not null default '{}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  title text not null check (char_length(title) between 3 and 220),
  content text not null,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','reviewed','final','archived')),
  version integer not null default 1,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.generated_documents(id) on delete cascade,
  version integer not null,
  content text not null,
  variables jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists template_versions_template_idx on public.template_versions (template_id, version desc);
create index if not exists generated_documents_process_idx on public.generated_documents (process_id, updated_at desc);
create index if not exists generated_documents_org_status_idx on public.generated_documents (organization_id, status, updated_at desc);
create index if not exists document_versions_document_idx on public.document_versions (document_id, version desc);

create or replace function public.snapshot_template_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.template_versions (template_id, version, title, content, variables, legal_basis, created_by)
  values (new.id, new.version, new.title, new.content, new.variables, new.legal_basis, new.created_by)
  on conflict (template_id, version) do update set
    title = excluded.title,
    content = excluded.content,
    variables = excluded.variables,
    legal_basis = excluded.legal_basis;
  return new;
end;
$$;

drop trigger if exists templates_snapshot_version on public.templates;
create trigger templates_snapshot_version
after insert or update of title, content, variables, legal_basis, version on public.templates
for each row execute procedure public.snapshot_template_version();

create or replace function public.snapshot_document_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.document_versions (document_id, version, content, variables, created_by)
  values (new.id, new.version, new.content, new.variables, new.created_by)
  on conflict (document_id, version) do update set
    content = excluded.content,
    variables = excluded.variables;
  return new;
end;
$$;

drop trigger if exists documents_snapshot_version on public.generated_documents;
create trigger documents_snapshot_version
after insert or update of content, variables, version on public.generated_documents
for each row execute procedure public.snapshot_document_version();

drop trigger if exists generated_documents_set_updated_at on public.generated_documents;
create trigger generated_documents_set_updated_at before update on public.generated_documents
for each row execute procedure public.set_updated_at();

alter table public.template_versions enable row level security;
alter table public.generated_documents enable row level security;
alter table public.document_versions enable row level security;

drop policy if exists "template_versions_select_available" on public.template_versions;
create policy "template_versions_select_available" on public.template_versions
for select to authenticated using (
  exists (
    select 1 from public.templates t
    where t.id = template_id
      and (t.is_octa_model = true or (t.organization_id is not null and public.is_org_member(t.organization_id)))
  )
);

drop policy if exists "documents_select_member" on public.generated_documents;
create policy "documents_select_member" on public.generated_documents
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "documents_insert_member" on public.generated_documents;
create policy "documents_insert_member" on public.generated_documents
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (select 1 from public.processes p where p.id = process_id and p.organization_id = organization_id)
);

drop policy if exists "documents_update_member" on public.generated_documents;
create policy "documents_update_member" on public.generated_documents
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "documents_delete_admin" on public.generated_documents;
create policy "documents_delete_admin" on public.generated_documents
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "document_versions_select_member" on public.document_versions;
create policy "document_versions_select_member" on public.document_versions
for select to authenticated using (
  exists (
    select 1 from public.generated_documents d
    where d.id = document_id and public.is_org_member(d.organization_id)
  )
);

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'aceite_simples',
  $title$Manifestação de Aceite do Encargo Pericial$title$,
  'petition',
  'aceite',
  $spec$Geral$spec$,
  $desc$Aceite objetivo da nomeação, com declaração de capacidade técnica, imparcialidade e ausência de impedimento.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

MANIFESTAÇÃO DE ACEITE DO ENCARGO PERICIAL

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) como perito(a) nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, em atenção à nomeação constante do Id. {{id_nomeacao}}, manifestar o ACEITE do encargo pericial.

O profissional declara possuir capacidade técnica compatível com o objeto da perícia, inexistindo, até o presente momento, causa de impedimento ou suspeição que comprometa sua atuação.

Compromete-se a conduzir os trabalhos com imparcialidade, independência técnica, diligência, rigor metodológico e observância às normas aplicáveis, limitando sua análise ao objeto pericial definido nos autos:

{{objeto_pericia}}

Diante do exposto, requer:

a) o recebimento da presente manifestação de aceite;

b) o regular prosseguimento da prova pericial; e

c) a intimação das partes para apresentação de quesitos, indicação de assistentes técnicos e juntada dos documentos necessários, caso ainda não tenham sido apresentados.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_nomeacao','objeto_pericia','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 148, 156 e 157, conforme o caso']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  10,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'aceite_agendamento_diligencia',
  $title$Aceite com Agendamento de Diligência Pericial$title$,
  'petition',
  'aceite_agendamento',
  $spec$Geral$spec$,
  $desc$Aceite acompanhado de data, horário, local de encontro, intimações e providências para a diligência.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

MANIFESTAÇÃO DE ACEITE E AGENDAMENTO DA DILIGÊNCIA

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) nos autos em epígrafe, vem, respeitosamente, manifestar o ACEITE do encargo pericial e informar o agendamento da diligência.

1. DO OBJETO

A atuação pericial observará o objeto delimitado nos autos, consistente em:

{{objeto_pericia}}

2. DO AGENDAMENTO

Data: {{data_diligencia}}
Horário: {{horario_diligencia}}
Local de encontro: {{local_encontro}}

3. DAS PROVIDÊNCIAS

Requer-se a intimação das partes, procuradores e assistentes técnicos para ciência e acompanhamento do ato pericial, facultando-se a apresentação prévia dos seguintes elementos:

{{documentos_solicitados}}

Orientações complementares para a diligência:

{{orientacoes_diligencia}}

Eventual impossibilidade de comparecimento ou de acesso ao local deverá ser comunicada nos autos com antecedência razoável, acompanhada da respectiva justificativa.

Diante do exposto, requer o recebimento do aceite, a ciência do agendamento e a adoção das providências necessárias ao regular desenvolvimento da prova.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','objeto_pericia','data_diligencia','horario_diligencia','local_encontro','documentos_solicitados','orientacoes_diligencia','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 465 e 474, conforme o caso']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  20,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'aceite_majoracao_custos',
  $title$Aceite com Pedido de Majoração por Complexidade e Custos$title$,
  'petition',
  'aceite_majoracao',
  $spec$Geral$spec$,
  $desc$Aceite com demonstração de escopo, custos operacionais e pedido de adequação dos honorários.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

MANIFESTAÇÃO DE ACEITE COM PEDIDO DE MAJORAÇÃO DOS HONORÁRIOS

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) nos autos em epígrafe, vem, respeitosamente, manifestar o ACEITE do encargo, sem prejuízo da necessária adequação dos honorários periciais.

1. DO OBJETO E DO ACEITE

A perícia possui como objeto:

{{objeto_pericia}}

O profissional aceita a nomeação e compromete-se a conduzir os trabalhos com imparcialidade, diligência e rigor técnico.

2. DA COMPLEXIDADE E DAS ATIVIDADES

Os honorários foram inicialmente arbitrados em {{valor_arbitrado}}. Após análise preliminar, verifica-se que a execução adequada exigirá:

{{atividades_necessarias}}

A complexidade técnica é caracterizada pelos seguintes elementos:

{{justificativa_complexidade}}

3. DOS CUSTOS ESTIMADOS

{{custos_estimados}}

O valor inicialmente arbitrado mostra-se insuficiente para remunerar as horas técnicas, a responsabilidade profissional e os custos indispensáveis à produção da prova.

4. DO PEDIDO

Diante do exposto, requer:

a) o recebimento do aceite;

b) o reconhecimento da complexidade e do escopo dos trabalhos;

c) a majoração dos honorários para {{valor_requerido}};

d) a adoção da seguinte forma de pagamento, caso aplicável: {{forma_pagamento}}; e

e) que o prazo de {{prazo_laudo}} para entrega do laudo tenha início após a definição definitiva dos honorários e a autorização para começo dos trabalhos.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_nomeacao','valor_arbitrado','valor_requerido','objeto_pericia','atividades_necessarias','custos_estimados','justificativa_complexidade','forma_pagamento','prazo_laudo','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 95 e 465, conforme o caso']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  30,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'aceite_majoracao_ajg',
  $title$Aceite com Majoração em Assistência Judiciária Gratuita$title$,
  'petition',
  'aceite_majoracao_ajg',
  $spec$Geral$spec$,
  $desc$Pedido de majoração limitado à regulamentação da assistência judiciária, com consulta e autorização quando cabíveis.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

ACEITE DO ENCARGO COM PEDIDO DE MAJORAÇÃO DOS HONORÁRIOS

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) nos autos em epígrafe, vem, respeitosamente, manifestar-se nos seguintes termos.

1. DO ACEITE

O profissional aceita o encargo e declara disponibilidade técnica para examinar o seguinte objeto:

{{objeto_pericia}}

2. DA COMPLEXIDADE

O valor de tabela considerado é {{valor_tabela}}. Entretanto, os trabalhos não se limitam a análise simples e exigirão:

{{atividades_necessarias}}

A necessidade de majoração decorre de:

{{justificativa_complexidade}}

3. DO ENQUADRAMENTO REGULAMENTAR

Nos termos de {{norma_ajg}}, requer-se a aplicação do multiplicador {{multiplicador}}, resultando no valor de {{valor_requerido}}, ou no limite máximo admitido pela regulamentação vigente.

4. DOS REQUERIMENTOS

Requer:

a) o recebimento do aceite;

b) o reconhecimento da complexidade técnica;

c) a consulta e autorização administrativa exigidas pela regulamentação, quando cabíveis;

d) a majoração para {{valor_requerido}}; e

e) que o prazo de {{prazo_laudo}} tenha início após a decisão definitiva sobre os honorários e a regular intimação do perito.

Caso não seja autorizada a majoração, requer nova intimação para avaliação da viabilidade de manutenção do aceite diante do valor definitivo.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_nomeacao','valor_tabela','multiplicador','valor_requerido','norma_ajg','objeto_pericia','atividades_necessarias','justificativa_complexidade','prazo_laudo','cidade_assinatura','data_assinatura']::text[],
  array['CPC, art. 95','Regulamentação vigente da assistência judiciária do tribunal competente']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  40,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'aceite_ambiental_alta_complexidade',
  $title$Aceite Ambiental de Alta Complexidade com Honorários Complementares$title$,
  'petition',
  'aceite_ambiental',
  $spec$Engenharia Ambiental$spec$,
  $desc$Modelo para perícias ambientais extensas, com geoprocessamento, análise multitemporal, campo e valoração de danos.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

MANIFESTAÇÃO DE ACEITE E PROPOSTA DE HONORÁRIOS — PERÍCIA AMBIENTAL COMPLEXA

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) nos autos em epígrafe, vem, respeitosamente, informar a ACEITAÇÃO do encargo.

Após análise preliminar, verifica-se que a perícia envolve área aproximada de {{area_estimada}} e possui como objeto:

{{objeto_pericia}}

A prova demanda atuação multidisciplinar e elevado rigor metodológico, incluindo, conforme aplicável:

{{atividades_ambientais}}

A sede profissional do perito encontra-se a {{distancia_deslocamento}} do local da diligência, sendo necessários deslocamento, eventual hospedagem, alimentação, processamento de dados geoespaciais, equipamentos e softwares especializados.

Custos e condicionantes operacionais:

{{custos_operacionais}}

Diante da natureza, extensão, relevância e responsabilidade dos trabalhos, requer o arbitramento de honorários complementares no valor de {{valor_requerido}}.

Subsidiariamente:

{{pedido_subsidiario}}

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','area_estimada','objeto_pericia','atividades_ambientais','distancia_deslocamento','custos_operacionais','valor_requerido','pedido_subsidiario','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 95, 156 e 465, conforme o caso']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  50,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'recusa_justificada',
  $title$Manifestação de Escusa/Recusa Justificada do Encargo Pericial$title$,
  'petition',
  'recusa_escusa',
  $spec$Geral$spec$,
  $desc$Modelo estruturado para recusa / escusa, com campos dinâmicos e revisão obrigatória.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

MANIFESTAÇÃO DE ESCUSA DO ENCARGO PERICIAL

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, nomeado(a) como perito(a) judicial nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, em atenção à nomeação constante do Id. {{id_nomeacao}}, manifestar-se nos seguintes termos:

1. DA NOMEAÇÃO

O profissional declara ciência da nomeação e da relevância do encargo pericial, reconhecendo o dever de atuação com imparcialidade, independência técnica, diligência e observância aos limites do objeto da prova.

2. DO MOTIVO LEGÍTIMO PARA A ESCUSA

Ocorre que, após análise preliminar da nomeação e das condições necessárias ao adequado desempenho do encargo, foi constatado o seguinte motivo legítimo:

{{motivo_escusa}}

A situação é detalhada da seguinte forma:

{{fundamentacao_motivo}}

{{documentos_comprobatorios}}

A manutenção do encargo, nas condições apresentadas, poderia comprometer a regularidade, a tempestividade ou a adequada especialização técnica da prova, razão pela qual a presente escusa é formulada de maneira imediata, fundamentada e transparente.

3. DOS REQUERIMENTOS

Diante do exposto, requer:

a) o recebimento da presente manifestação;

b) o acolhimento da escusa do encargo pericial, em razão do motivo legítimo acima exposto;

c) a nomeação de outro profissional com disponibilidade e qualificação compatíveis com o objeto da perícia; e

d) que as futuras intimações relativas ao encargo ora recusado sejam consideradas prejudicadas após o acolhimento da presente manifestação.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_nomeacao','data_intimacao','motivo_escusa','fundamentacao_motivo','documentos_comprobatorios','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 157, 148 e 467, conforme o motivo aplicável']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  60,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'prorrogacao_prazo_laudo',
  $title$Pedido de Prorrogação do Prazo para Apresentação do Laudo Pericial$title$,
  'petition',
  'prorrogacao',
  $spec$Geral$spec$,
  $desc$Modelo estruturado para prorrogação, com campos dinâmicos e revisão obrigatória.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

PEDIDO DE PRORROGAÇÃO DO PRAZO PERICIAL

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, perito(a) nomeado(a) nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, requerer a prorrogação do prazo para apresentação do laudo pericial, pelos fundamentos a seguir expostos.

1. DO PRAZO EM CURSO

O prazo originalmente fixado para conclusão dos trabalhos periciais é de {{prazo_original}}, com término previsto para {{data_final_atual}}.

2. DO MOTIVO JUSTIFICADO

Durante a execução dos trabalhos, verificou-se a necessidade de prazo adicional em razão de:

{{motivo_prorrogacao}}

Até o presente momento, foram realizadas as seguintes atividades:

{{atividades_ja_realizadas}}

Permanecem pendentes, para a adequada conclusão técnica da prova:

{{atividades_pendentes}}

A prorrogação é necessária para evitar conclusão precipitada, incompleta ou tecnicamente insuficiente, preservando a qualidade da prova e o atendimento integral ao objeto pericial e aos quesitos formulados.

3. DO PEDIDO

Diante do exposto, requer a concessão de prorrogação por {{dias_prorrogacao}} dias, ou pelo período que Vossa Excelência entender adequado, sugerindo-se como nova data-limite {{nova_data_sugerida}}.

O perito reafirma seu compromisso com a conclusão dos trabalhos no prazo adicional deferido.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','prazo_original','data_final_atual','motivo_prorrogacao','atividades_ja_realizadas','atividades_pendentes','dias_prorrogacao','nova_data_sugerida','cidade_assinatura','data_assinatura']::text[],
  array['CPC, art. 476']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  70,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'levantamento_honorarios',
  $title$Pedido de Levantamento/Liberação de Honorários Periciais$title$,
  'petition',
  'honorários',
  $spec$Geral$spec$,
  $desc$Modelo estruturado para honorários, com campos dinâmicos e revisão obrigatória.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

PEDIDO DE LEVANTAMENTO DE HONORÁRIOS PERICIAIS

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, perito(a) nomeado(a) nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, requerer a liberação dos honorários periciais, nos seguintes termos.

1. DO CUMPRIMENTO DO ENCARGO

O laudo pericial foi protocolado em {{data_entrega_laudo}}, sob o Id. {{id_laudo}}, contendo a descrição do objeto, a metodologia adotada, a análise técnica, as respostas aos quesitos e a conclusão pericial.

{{situacao_esclarecimentos}}

{{id_esclarecimentos}}

2. DOS HONORÁRIOS DEPOSITADOS

Conforme consta dos autos, foi depositado o valor de {{valor_depositado}} a título de honorários periciais.

Considerando o cumprimento da etapa processual correspondente e a decisão de arbitramento, requer-se a liberação de {{percentual_liberacao}} dos honorários, mediante {{forma_liberacao}}.

Os dados bancários deverão ser obtidos do cadastro profissional seguro do perito, evitando-se sua reprodução desnecessária no corpo do modelo:

{{dados_bancarios_perfil}}

3. DO PEDIDO

Diante do exposto, requer:

a) o reconhecimento do cumprimento do encargo pericial na etapa correspondente;

b) a expedição do competente alvará, ordem de transferência ou procedimento eletrônico equivalente para levantamento dos honorários; e

c) a intimação do perito caso seja necessária qualquer informação complementar para efetivação da liberação.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_laudo','data_entrega_laudo','id_esclarecimentos','situacao_esclarecimentos','valor_depositado','percentual_liberacao','forma_liberacao','dados_bancarios_perfil','cidade_assinatura','data_assinatura']::text[],
  array['CPC, art. 465, § 4º, conforme a fase processual e a decisão de arbitramento']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  80,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'apresentacao_laudo',
  $title$Manifestação de Apresentação e Juntada do Laudo Pericial$title$,
  'petition',
  'apresentacao_de_laudo',
  $spec$Geral$spec$,
  $desc$Modelo estruturado para apresentação de laudo, com campos dinâmicos e revisão obrigatória.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

APRESENTAÇÃO DO LAUDO PERICIAL

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, perito(a) nomeado(a) nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar o LAUDO PERICIAL elaborado em cumprimento ao encargo recebido.

1. DO DOCUMENTO APRESENTADO

O laudo anexo contém {{quantidade_paginas}} páginas e foi elaborado com base no objeto pericial delimitado nos autos, consistente em:

{{objeto_pericia}}

O documento apresenta, conforme aplicável ao caso:

- identificação do objeto e das questões técnicas examinadas;
- relação dos documentos analisados;
- metodologia e critérios técnicos utilizados;
- descrição das diligências e constatações;
- análise técnica ou científica;
- respostas aos quesitos formulados; e
- conclusão pericial.

2. DOS ANEXOS E DOCUMENTOS TÉCNICOS

Integram a entrega os seguintes anexos e documentos complementares:

{{anexos_laudo}}

{{art_rtt}}

3. DOS REQUERIMENTOS

Diante do exposto, requer:

a) a juntada do laudo pericial e de seus anexos aos autos;

b) a intimação das partes e dos assistentes técnicos para ciência e manifestação, na forma processual cabível; e

c) o regular prosseguimento do feito.

{{pendencias_honorarios}}

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','objeto_pericia','quantidade_paginas','anexos_laudo','art_rtt','pendencias_honorarios','cidade_assinatura','data_assinatura']::text[],
  array['CPC, arts. 473 e 477, conforme o caso']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  90,
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

insert into public.templates (
  organization_id, slug, title, category, document_type, specialty, description,
  content, variables, legal_basis, is_octa_model, version, status, revision_date,
  source_label, sort_order, created_by
) values (
  null,
  'esclarecimentos_laudo',
  $title$Manifestação de Esclarecimentos ao Laudo Pericial$title$,
  'petition',
  'esclarecimentos',
  $spec$Geral$spec$,
  $desc$Modelo estruturado para esclarecimentos, com campos dinâmicos e revisão obrigatória.$desc$,
  jsonb_build_object('body', $body${{tratamento_juizo}} DA {{vara}} DA COMARCA DE {{comarca}}

PROCESSO Nº {{numero_processo}}
CLASSE: {{classe_processual}}
AUTOR(A): {{autor}}
RÉU(RÉ): {{reu}}

ESCLARECIMENTOS AO LAUDO PERICIAL

{{nome_perito}}, {{qualificacao_profissional}}, inscrito(a) no {{registro_profissional}}, perito(a) nomeado(a) nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, em atenção à intimação de Id. {{id_intimacao_esclarecimentos}}, apresentar esclarecimentos ao laudo pericial de Id. {{id_laudo}}.

1. DA DELIMITAÇÃO DOS ESCLARECIMENTOS

Os esclarecimentos foram requeridos por {{parte_requerente_esclarecimentos}} e se limitam aos pontos de dúvida, divergência ou complementação expressamente apresentados, sem alteração indevida do objeto pericial originalmente definido.

2. DOS PONTOS SUBMETIDOS E DAS RESPOSTAS

Questões apresentadas:

{{questoes_esclarecimentos}}

Respostas técnicas:

{{respostas_esclarecimentos}}

3. DA CONCLUSÃO PERICIAL

{{impacto_conclusao}}

{{documentos_complementares}}

4. DOS REQUERIMENTOS

Diante do exposto, requer:

a) a juntada da presente manifestação de esclarecimentos;

b) que as respostas sejam consideradas parte integrante do laudo pericial; e

c) o regular prosseguimento do feito.

Termos em que,
Pede deferimento.

{{cidade_assinatura}}, {{data_assinatura}}.

_______________________________________________
{{nome_perito}}
{{qualificacao_profissional}}
{{registro_profissional}}$body$),
  array['tratamento_juizo','vara','comarca','numero_processo','classe_processual','autor','reu','nome_perito','qualificacao_profissional','registro_profissional','id_laudo','id_intimacao_esclarecimentos','parte_requerente_esclarecimentos','questoes_esclarecimentos','respostas_esclarecimentos','impacto_conclusao','documentos_complementares','cidade_assinatura','data_assinatura']::text[],
  array['CPC, art. 477, § 2º']::text[],
  true,
  1,
  'active',
  current_date,
  'Biblioteca Técnica OCTA Perito',
  100,
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
