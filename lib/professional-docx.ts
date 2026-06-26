import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";
import { imageSize } from "image-size";
import type { BrandAsset, DocumentIdentity } from "@/lib/document-identity";
import { formatLongDate, valueOrPlaceholder } from "@/lib/document-identity";
import type { ExportAttachment, ReportExportInput } from "@/lib/export-types";
import { questionOriginLabel, sourceTypeLabel } from "@/lib/report-options";

const BODY_SIZE = 22;
const SMALL_SIZE = 18;
const PAGE_WIDTH_PX = 620;

function imageType(asset: BrandAsset): "jpg" | "png" | null {
  const mime = asset.mimeType.toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  return null;
}

function fittedImage(asset: BrandAsset, maxWidth: number, maxHeight: number) {
  const type = imageType(asset);
  if (!type) return null;
  const dimensions = imageSize(asset.data);
  const width = dimensions.width || maxWidth;
  const height = dimensions.height || maxHeight;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return new ImageRun({
    type,
    data: asset.data,
    transformation: {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    },
  });
}

function bodyParagraph(text: string, options?: { bold?: boolean; italic?: boolean; center?: boolean; after?: number }) {
  return new Paragraph({
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: options?.after ?? 120, line: 330 },
    children: [new TextRun({ text, bold: options?.bold, italics: options?.italic, size: BODY_SIZE, font: "Arial" })],
  });
}

function contentParagraphs(content: string) {
  const paragraphs: Paragraph[] = [];
  for (const rawLine of content.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }
    const bulletMatch = line.match(/^(?:•|-|–)\s+(.+)$/);
    if (bulletMatch) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 320 },
        children: [new TextRun({ text: bulletMatch[1], size: BODY_SIZE, font: "Arial" })],
      }));
      continue;
    }
    paragraphs.push(bodyParagraph(line));
  }
  return paragraphs;
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 260, after: 140 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24, font: "Arial" })],
  });
}

function makeHeader(identity: DocumentIdentity) {
  const logo = identity.includeLogo && identity.logo ? fittedImage(identity.logo, 95, 42) : null;
  const leftChildren = logo
    ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [logo] })]
    : [new Paragraph({ children: [new TextRun({ text: identity.officeName, bold: true, size: 18, color: identity.primaryColor })] })];
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: identity.primaryColor },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: leftChildren }),
              new TableCell({
                width: { size: 68, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: identity.headerText || identity.officeName, bold: true, size: 17, color: identity.secondaryColor, font: "Arial" })],
                })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function makeFooter(identity: DocumentIdentity) {
  const pageRuns = identity.showPageNumbers
    ? [new TextRun({ text: "  |  Página ", size: SMALL_SIZE, color: "5D6A75" }), new TextRun({ children: [PageNumber.CURRENT], size: SMALL_SIZE, color: "5D6A75" }), new TextRun({ text: " de ", size: SMALL_SIZE, color: "5D6A75" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: SMALL_SIZE, color: "5D6A75" })]
    : [];
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: identity.primaryColor } },
        spacing: { before: 80 },
        children: [new TextRun({ text: identity.footerText, size: SMALL_SIZE, color: "5D6A75", font: "Arial" }), ...pageRuns],
      }),
    ],
  });
}

function coverChildren(input: ReportExportInput) {
  const { identity, report, process } = input;
  const children: Array<Paragraph | Table> = [];
  if (identity.includeLogo && identity.logo) {
    const logo = fittedImage(identity.logo, 230, 110);
    if (logo) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [logo] }));
  } else {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: identity.officeName.toUpperCase(), bold: true, size: 36, color: identity.primaryColor, font: "Arial" })] }));
  }
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500, after: 180 }, children: [new TextRun({ text: "LAUDO TÉCNICO PERICIAL", bold: true, size: 38, color: identity.secondaryColor, font: "Arial" })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: report.title, bold: true, size: 30, color: identity.primaryColor, font: "Arial" })] }));
  children.push(new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 82, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: identity.primaryColor },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: identity.primaryColor },
      left: { style: BorderStyle.SINGLE, size: 6, color: identity.primaryColor },
      right: { style: BorderStyle.SINGLE, size: 6, color: identity.primaryColor },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D5DEE5" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      ["Processo", valueOrPlaceholder(process.process_number)],
      ["Comarca", valueOrPlaceholder(process.district)],
      ["Vara", valueOrPlaceholder(process.division)],
      ["Autor/Requerente", valueOrPlaceholder(process.plaintiff)],
      ["Réu/Requerido", valueOrPlaceholder(process.defendant)],
    ].map(([label, value]) => new TableRow({ children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: identity.secondaryColor })] })] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })] }),
    ] })),
  }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 80 }, children: [new TextRun({ text: identity.cityState || process.district || "", bold: true, size: 22, color: identity.secondaryColor })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatLongDate(report.report_date), size: 22, color: identity.secondaryColor })] }));
  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

function identificationTable(input: ReportExportInput) {
  const rows = [
    ["Processo", valueOrPlaceholder(input.process.process_number)],
    ["Tribunal", valueOrPlaceholder(input.process.court)],
    ["Comarca", valueOrPlaceholder(input.process.district)],
    ["Vara", valueOrPlaceholder(input.process.division)],
    ["Classe processual", valueOrPlaceholder(input.process.case_class)],
    ["Autor/Requerente", valueOrPlaceholder(input.process.plaintiff)],
    ["Réu/Requerido", valueOrPlaceholder(input.process.defendant)],
    ["Objeto", valueOrPlaceholder(input.process.subject)],
    ["Perito", valueOrPlaceholder(input.identity.professionalName)],
    ["Registro profissional", valueOrPlaceholder(input.identity.councilRegistration)],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "AAB8C2" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAB8C2" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "AAB8C2" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "AAB8C2" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D5DEE5" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "D5DEE5" },
    },
    rows: rows.map(([label, value]) => new TableRow({ children: [
      new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: input.identity.secondaryColor })] })] }),
      new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })] }),
    ] })),
  });
}

function questionChildren(input: ReportExportInput) {
  if (!input.questions.length) return [];
  const children: Array<Paragraph> = [heading("QUESITOS E RESPOSTAS")];
  const grouped = new Map<string, typeof input.questions>();
  for (const question of [...input.questions].sort((a, b) => a.sort_order - b.sort_order)) {
    const origin = questionOriginLabel(question.origin, question.origin_label);
    grouped.set(origin, [...(grouped.get(origin) || []), question]);
  }
  for (const [origin, questions] of grouped) {
    children.push(heading(origin.toUpperCase(), HeadingLevel.HEADING_2));
    for (const item of questions) {
      children.push(bodyParagraph(`${item.question_number ? `${item.question_number}. ` : ""}${item.question}`, { bold: true }));
      children.push(bodyParagraph(`Resposta: ${item.answer.trim() || "[RESPOSTA NÃO PREENCHIDA]"}`));
    }
  }
  return children;
}

function sourceChildren(input: ReportExportInput) {
  if (!input.sources.length) return [];
  const children: Paragraph[] = [heading("DOCUMENTOS E FONTES ANALISADAS")];
  for (const source of [...input.sources].sort((a, b) => a.sort_order - b.sort_order)) {
    const details = [sourceTypeLabel(source.source_type), source.reference_label, source.source_date ? formatLongDate(source.source_date) : null].filter(Boolean).join(" · ");
    children.push(bodyParagraph(`${source.title}${details ? ` — ${details}` : ""}`, { bold: true }));
    if (source.description) children.push(bodyParagraph(source.description));
  }
  return children;
}

function equipmentChildren(input: ReportExportInput) {
  if (!input.equipment.length) return [];
  const children: Paragraph[] = [heading("EQUIPAMENTOS UTILIZADOS")];
  for (const item of [...input.equipment].sort((a, b) => a.sort_order - b.sort_order)) {
    const identification = [item.brand, item.model, item.serial_number ? `S/N ${item.serial_number}` : null].filter(Boolean).join(" · ");
    children.push(bodyParagraph(`${item.name}${identification ? ` — ${identification}` : ""}`, { bold: true }));
    if (item.calibration_certificate) children.push(bodyParagraph(`Certificado de calibração: ${item.calibration_certificate}`));
    if (item.calibration_date || item.calibration_due_date) children.push(bodyParagraph(`Calibração: ${item.calibration_date ? formatLongDate(item.calibration_date) : "não informada"} · Validade: ${item.calibration_due_date ? formatLongDate(item.calibration_due_date) : "não informada"}`));
    if (item.usage_description) children.push(bodyParagraph(item.usage_description));
  }
  return children;
}

function photoChildren(attachments: ExportAttachment[]) {
  if (!attachments.length) return [];
  const children: Array<Paragraph> = [heading("REGISTRO FOTOGRÁFICO E ANEXOS")];
  let photoNumber = 0;
  for (const item of [...attachments].sort((a, b) => a.sort_order - b.sort_order)) {
    if (item.asset) {
      const image = fittedImage(item.asset, PAGE_WIDTH_PX, 650);
      if (image) {
        photoNumber += 1;
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 180, after: 80 }, keepNext: true, children: [image] }));
        const caption = item.caption || item.original_name;
        children.push(bodyParagraph(`Figura ${photoNumber} — ${caption}`, { bold: true, center: true, after: 40 }));
        const details = [item.description, item.location_text, item.captured_at ? formatLongDate(item.captured_at.slice(0, 10)) : null].filter(Boolean).join(" · ");
        if (details) children.push(bodyParagraph(details, { italic: true, center: true, after: 160 }));
        continue;
      }
    }
    children.push(bodyParagraph(`Anexo — ${item.caption || item.original_name}`, { bold: true }));
    const details = [item.description, item.location_text, item.captured_at ? formatLongDate(item.captured_at.slice(0, 10)) : null].filter(Boolean).join(" · ");
    if (details) children.push(bodyParagraph(details));
  }
  return children;
}

function signatureChildren(identity: DocumentIdentity) {
  const children: Paragraph[] = [new Paragraph({ spacing: { before: 700 } })];
  if (identity.includeSignature && identity.signature) {
    const signature = fittedImage(identity.signature, 240, 105);
    if (signature) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [signature] }));
  }
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: identity.secondaryColor } }, spacing: { before: 20, after: 40 }, children: [new TextRun({ text: identity.professionalName.toUpperCase(), bold: true, size: 22, color: identity.secondaryColor })] }));
  if (identity.professionalTitles) children.push(bodyParagraph(identity.professionalTitles, { center: true, after: 20 }));
  if (identity.councilRegistration) children.push(bodyParagraph(identity.councilRegistration, { center: true, after: 20 }));
  if (identity.contactLine) children.push(bodyParagraph(identity.contactLine, { center: true, after: 20 }));
  return children;
}

export async function createProfessionalReportDocx(input: ReportExportInput) {
  const children: Array<Paragraph | Table> = [];
  if (input.identity.showCover) children.push(...coverChildren(input));
  if (input.identity.showTableOfContents) {
    children.push(heading("SUMÁRIO"));
    const tocItems = [
      "Identificação do processo",
      ...input.sections.filter((item) => item.is_enabled).sort((a, b) => a.sort_order - b.sort_order).map((item) => item.title),
      ...(input.questions.length ? ["Quesitos e respostas"] : []),
      ...(input.sources.length ? ["Documentos e fontes analisadas"] : []),
      ...(input.equipment.length ? ["Equipamentos utilizados"] : []),
      ...(input.attachments.length ? ["Registro fotográfico e anexos"] : []),
    ];
    tocItems.forEach((item, index) => children.push(new Paragraph({
      spacing: { after: 90 },
      children: [new TextRun({ text: `${index + 1}. ${item}`, size: 22, color: input.identity.secondaryColor, font: "Arial" })],
    })));
    children.push(new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: "Estrutura gerada automaticamente pelo OCTA Perito.", italics: true, size: 18, color: "687681", font: "Arial" })] }));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  children.push(heading("IDENTIFICAÇÃO DO PROCESSO"));
  children.push(identificationTable(input));
  for (const section of [...input.sections].filter((item) => item.is_enabled).sort((a, b) => a.sort_order - b.sort_order)) {
    children.push(heading(section.title.toUpperCase()));
    children.push(...contentParagraphs(section.content.trim() || "[INFORMAÇÃO NÃO PREENCHIDA]"));
  }
  children.push(...questionChildren(input));
  children.push(...sourceChildren(input));
  children.push(...equipmentChildren(input));
  children.push(...photoChildren(input.attachments));
  children.push(...signatureChildren(input.identity));

  const document = new Document({
    creator: "OCTA Perito",
    title: input.report.title,
    description: "Laudo técnico pericial gerado no OCTA Perito",
    features: { updateFields: true },
    styles: {
      default: {
        document: { run: { font: "Arial", size: BODY_SIZE, color: "1D2730" }, paragraph: { spacing: { line: 330, after: 120 } } },
        heading1: { run: { font: "Arial", size: 28, bold: true, color: input.identity.primaryColor }, paragraph: { spacing: { before: 260, after: 140 } } },
        heading2: { run: { font: "Arial", size: 24, bold: true, color: input.identity.secondaryColor }, paragraph: { spacing: { before: 220, after: 120 } } },
      },
    },
    sections: [{
      properties: {
        titlePage: input.identity.showCover,
        page: {
          margin: {
            top: convertInchesToTwip(0.85),
            right: convertInchesToTwip(0.82),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(0.9),
            header: convertInchesToTwip(0.32),
            footer: convertInchesToTwip(0.32),
          },
        },
      },
      headers: { default: makeHeader(input.identity), first: new Header({ children: [] }) },
      footers: { default: makeFooter(input.identity), first: new Footer({ children: [] }) },
      children,
    }],
  });
  return Packer.toBuffer(document);
}

export async function createProfessionalTextDocx(input: { title: string; content: string; identity: DocumentIdentity }) {
  const children: Array<Paragraph | Table> = [];
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 }, children: [new TextRun({ text: input.title, bold: true, size: 30, color: input.identity.primaryColor, font: "Arial" })] }));
  children.push(...contentParagraphs(input.content));
  children.push(...signatureChildren(input.identity));
  const document = new Document({
    creator: "OCTA Perito",
    title: input.title,
    features: { updateFields: true },
    styles: { default: { document: { run: { font: "Arial", size: BODY_SIZE }, paragraph: { spacing: { line: 330, after: 120 } } } } },
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(0.85), right: convertInchesToTwip(0.82), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.9), header: convertInchesToTwip(0.32), footer: convertInchesToTwip(0.32) } } },
      headers: { default: makeHeader(input.identity) },
      footers: { default: makeFooter(input.identity) },
      children,
    }],
  });
  return Packer.toBuffer(document);
}
