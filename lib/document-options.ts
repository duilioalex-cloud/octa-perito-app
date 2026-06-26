export const DOCUMENT_STATUS_OPTIONS = [
  ["draft", "Rascunho"],
  ["reviewed", "Revisado"],
  ["final", "Final"],
  ["archived", "Arquivado"],
] as const;

export const TEMPLATE_CATEGORY_OPTIONS = [
  ["petition", "Petição / manifestação"],
  ["report", "Laudo"],
  ["opinion", "Parecer"],
  ["checklist", "Checklist"],
  ["technical_block", "Bloco técnico"],
] as const;

export function documentStatusLabel(value?: string | null) {
  return DOCUMENT_STATUS_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Rascunho";
}

export function templateCategoryLabel(value?: string | null) {
  return TEMPLATE_CATEGORY_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Modelo";
}

export function templateBody(content: unknown) {
  if (content && typeof content === "object" && "body" in content) {
    const body = (content as { body?: unknown }).body;
    return typeof body === "string" ? body : "";
  }
  return typeof content === "string" ? content : "";
}

export function extractVariables(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g), (match) => match[1])));
}

export function variableLabel(value: string) {
  const labels: Record<string, string> = {
    tratamento_juizo: "Endereçamento ao Juízo",
    vara: "Vara",
    comarca: "Comarca",
    numero_processo: "Número do processo",
    classe_processual: "Classe processual",
    autor: "Autor(a)",
    reu: "Réu(ré)",
    nome_perito: "Nome do perito",
    qualificacao_profissional: "Qualificação profissional",
    registro_profissional: "Registro profissional",
    objeto_pericia: "Objeto da perícia",
    data_diligencia: "Data da diligência",
    horario_diligencia: "Horário da diligência",
    local_encontro: "Local de encontro",
    valor_arbitrado: "Valor arbitrado",
    valor_requerido: "Valor requerido",
    cidade_assinatura: "Cidade da assinatura",
    data_assinatura: "Data da assinatura",
  };
  return labels[value] ?? value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function replaceTemplateVariables(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = values[key]?.trim();
    return value || "[INFORMAÇÃO NÃO PREENCHIDA]";
  });
}
