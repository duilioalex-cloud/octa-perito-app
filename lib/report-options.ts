export const REPORT_STATUS_OPTIONS = [
  ["draft", "Rascunho"],
  ["in_review", "Em revisão"],
  ["final", "Finalizado"],
  ["filed", "Protocolado"],
  ["archived", "Arquivado"],
] as const;

export const SECTION_REVIEW_STATUS_OPTIONS = [
  ["draft", "Em elaboração"],
  ["reviewed", "Revisada"],
  ["final", "Final"],
] as const;

export const QUESTION_ORIGIN_OPTIONS = [
  ["court", "Juízo"],
  ["plaintiff", "Autor/Requerente"],
  ["defendant", "Réu/Requerido"],
  ["prosecutor", "Ministério Público"],
  ["assistant", "Assistente técnico"],
  ["other", "Outra origem"],
] as const;

export const QUESTION_STATUS_OPTIONS = [
  ["pending", "Pendente"],
  ["answered", "Respondido"],
  ["reviewed", "Revisado"],
  ["not_applicable", "Não aplicável"],
] as const;

export const SOURCE_TYPE_OPTIONS = [
  ["case_document", "Documento dos autos"],
  ["external_document", "Documento externo"],
  ["measurement", "Medição"],
  ["image", "Imagem"],
  ["testimony", "Relato/entrevista"],
  ["inspection", "Constatação de vistoria"],
  ["other", "Outra fonte"],
] as const;

export const ATTACHMENT_TYPE_OPTIONS = [
  ["photo", "Fotografia"],
  ["document", "Documento"],
  ["map", "Mapa"],
  ["certificate", "Certificado"],
  ["spreadsheet", "Planilha"],
  ["drawing", "Desenho/prancha"],
  ["other", "Outro"],
] as const;

export const TECHNICAL_BLOCK_CATEGORY_OPTIONS = [
  ["methodology", "Metodologia"],
  ["analysis", "Análise"],
  ["limitation", "Limitação"],
  ["conclusion", "Conclusão"],
  ["answer", "Resposta a quesito"],
  ["equipment", "Equipamento"],
  ["legal_note", "Nota normativa"],
  ["other", "Outro"],
] as const;

function labelFrom<T extends readonly (readonly [string, string])[]>(options: T, value: string | null | undefined) {
  return options.find(([key]) => key === value)?.[1] ?? value ?? "Não informado";
}

export function reportStatusLabel(value: string | null | undefined) {
  return labelFrom(REPORT_STATUS_OPTIONS, value);
}

export function sectionReviewStatusLabel(value: string | null | undefined) {
  return labelFrom(SECTION_REVIEW_STATUS_OPTIONS, value);
}

export function questionOriginLabel(value: string | null | undefined, custom?: string | null) {
  return custom || labelFrom(QUESTION_ORIGIN_OPTIONS, value);
}

export function questionStatusLabel(value: string | null | undefined) {
  return labelFrom(QUESTION_STATUS_OPTIONS, value);
}

export function sourceTypeLabel(value: string | null | undefined) {
  return labelFrom(SOURCE_TYPE_OPTIONS, value);
}

export function attachmentTypeLabel(value: string | null | undefined) {
  return labelFrom(ATTACHMENT_TYPE_OPTIONS, value);
}

export function technicalBlockCategoryLabel(value: string | null | undefined) {
  return labelFrom(TECHNICAL_BLOCK_CATEGORY_OPTIONS, value);
}

export function contentKindLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    rich_text: "Texto técnico",
    questions: "Quesitos",
    photos: "Fotografias",
    attachments: "Anexos",
    sources: "Fontes analisadas",
    equipment: "Equipamentos",
    conclusion: "Conclusão",
  };
  return labels[value || ""] || value || "Conteúdo";
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes < 1) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "arquivo";
}
