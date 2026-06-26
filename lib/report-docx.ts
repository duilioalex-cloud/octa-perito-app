import { createDocx } from "@/lib/docx";
import { questionOriginLabel, sourceTypeLabel } from "@/lib/report-options";

type ReportRow = {
  title: string;
  report_date: string | null;
  notes: string | null;
};

type ProcessRow = {
  process_number: string;
  court: string | null;
  district: string | null;
  division: string | null;
  case_class: string | null;
  plaintiff: string | null;
  defendant: string | null;
  subject: string | null;
};

type SectionRow = {
  title: string;
  content: string;
  is_enabled: boolean;
  sort_order: number;
};

type QuestionRow = {
  origin: string;
  origin_label: string | null;
  question_number: string | null;
  question: string;
  answer: string;
  answer_status: string;
  sort_order: number;
};

type SourceRow = {
  source_type: string;
  title: string;
  reference_label: string | null;
  description: string | null;
  source_date: string | null;
  sort_order: number;
};

type EquipmentRow = {
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  calibration_certificate: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  usage_description: string | null;
  sort_order: number;
};

type AttachmentRow = {
  file_type: string;
  original_name: string;
  caption: string | null;
  description: string | null;
  location_text: string | null;
  captured_at: string | null;
  sort_order: number;
};

function valueOrPlaceholder(value: string | null | undefined) {
  return value?.trim() || "[INFORMAÇÃO NÃO PREENCHIDA]";
}

export function buildReportText(input: {
  report: ReportRow;
  process: ProcessRow;
  sections: SectionRow[];
  questions: QuestionRow[];
  sources: SourceRow[];
  equipment: EquipmentRow[];
  attachments: AttachmentRow[];
}) {
  const { report, process } = input;
  const lines: string[] = [];

  lines.push("IDENTIFICAÇÃO DO PROCESSO");
  lines.push(`Processo: ${valueOrPlaceholder(process.process_number)}`);
  lines.push(`Tribunal: ${valueOrPlaceholder(process.court)}`);
  lines.push(`Comarca: ${valueOrPlaceholder(process.district)}`);
  lines.push(`Vara: ${valueOrPlaceholder(process.division)}`);
  lines.push(`Classe processual: ${valueOrPlaceholder(process.case_class)}`);
  lines.push(`Autor/Requerente: ${valueOrPlaceholder(process.plaintiff)}`);
  lines.push(`Réu/Requerido: ${valueOrPlaceholder(process.defendant)}`);
  lines.push(`Objeto: ${valueOrPlaceholder(process.subject)}`);
  if (report.report_date) lines.push(`Data do laudo: ${report.report_date.split("-").reverse().join("/")}`);
  lines.push("");

  for (const section of input.sections.filter((item) => item.is_enabled).sort((a, b) => a.sort_order - b.sort_order)) {
    lines.push(section.title.toUpperCase());
    lines.push(section.content.trim() || "[INFORMAÇÃO NÃO PREENCHIDA]");
    lines.push("");
  }

  if (input.questions.length) {
    lines.push("QUESITOS E RESPOSTAS");
    const grouped = new Map<string, QuestionRow[]>();
    for (const question of input.questions.sort((a, b) => a.sort_order - b.sort_order)) {
      const origin = questionOriginLabel(question.origin, question.origin_label);
      grouped.set(origin, [...(grouped.get(origin) || []), question]);
    }
    for (const [origin, questions] of grouped) {
      lines.push(origin.toUpperCase());
      for (const item of questions) {
        lines.push(`${item.question_number ? `${item.question_number}. ` : ""}${item.question}`);
        lines.push(`Resposta: ${item.answer.trim() || "[RESPOSTA NÃO PREENCHIDA]"}`);
        lines.push("");
      }
    }
  }

  if (input.sources.length) {
    lines.push("DOCUMENTOS E FONTES ANALISADAS");
    for (const source of input.sources.sort((a, b) => a.sort_order - b.sort_order)) {
      const details = [sourceTypeLabel(source.source_type), source.reference_label, source.source_date].filter(Boolean).join(" · ");
      lines.push(`• ${source.title}${details ? ` — ${details}` : ""}`);
      if (source.description) lines.push(source.description);
    }
    lines.push("");
  }

  if (input.equipment.length) {
    lines.push("EQUIPAMENTOS UTILIZADOS");
    for (const item of input.equipment.sort((a, b) => a.sort_order - b.sort_order)) {
      const identification = [item.brand, item.model, item.serial_number ? `S/N ${item.serial_number}` : null].filter(Boolean).join(" · ");
      lines.push(`• ${item.name}${identification ? ` — ${identification}` : ""}`);
      if (item.calibration_certificate) lines.push(`Certificado de calibração: ${item.calibration_certificate}`);
      if (item.calibration_date || item.calibration_due_date) lines.push(`Calibração: ${item.calibration_date || "não informada"} · Validade: ${item.calibration_due_date || "não informada"}`);
      if (item.usage_description) lines.push(item.usage_description);
    }
    lines.push("");
  }

  if (input.attachments.length) {
    lines.push("RELAÇÃO DE ANEXOS");
    for (const item of input.attachments.sort((a, b) => a.sort_order - b.sort_order)) {
      lines.push(`• ${item.caption || item.original_name}`);
      const details = [item.description, item.location_text, item.captured_at].filter(Boolean).join(" · ");
      if (details) lines.push(details);
    }
    lines.push("");
  }

  if (report.notes) {
    lines.push("NOTAS INTERNAS DO LAUDO");
    lines.push(report.notes);
  }

  return lines.join("\n");
}

export function createReportDocx(title: string, content: string) {
  return createDocx(title, content);
}
