import { PDFDocument, PDFImage, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { BrandAsset, DocumentIdentity } from "@/lib/document-identity";
import { formatLongDate, valueOrPlaceholder } from "@/lib/document-identity";
import type { ReportExportInput } from "@/lib/export-types";
import { questionOriginLabel, sourceTypeLabel } from "@/lib/report-options";

const A4: [number, number] = [595.28, 841.89];
const MARGIN_X = 54;
const CONTENT_TOP = 760;
const CONTENT_BOTTOM = 62;

function hexToRgb(hex: string) {
  const value = hex.replace(/^#/, "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

async function embedAsset(pdf: PDFDocument, asset: BrandAsset | null): Promise<PDFImage | null> {
  if (!asset) return null;
  const mime = asset.mimeType.toLowerCase();
  try {
    if (mime.includes("png")) return await pdf.embedPng(asset.data);
    if (mime.includes("jpeg") || mime.includes("jpg")) return await pdf.embedJpg(asset.data);
  } catch {
    return null;
  }
  return null;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${line} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

type WriterFonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

class PdfWriter {
  readonly pdf: PDFDocument;
  readonly fonts: WriterFonts;
  readonly identity: DocumentIdentity;
  readonly primary: ReturnType<typeof rgb>;
  readonly secondary: ReturnType<typeof rgb>;
  readonly textColor = rgb(0.12, 0.16, 0.19);
  readonly muted = rgb(0.36, 0.42, 0.47);
  page: PDFPage;
  y = CONTENT_TOP;

  constructor(pdf: PDFDocument, fonts: WriterFonts, identity: DocumentIdentity, startPage: PDFPage) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.identity = identity;
    this.primary = hexToRgb(identity.primaryColor);
    this.secondary = hexToRgb(identity.secondaryColor);
    this.page = startPage;
  }

  newPage() {
    this.page = this.pdf.addPage(A4);
    this.y = CONTENT_TOP;
    return this.page;
  }

  ensureSpace(height: number) {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  currentPageNumber() {
    return this.pdf.getPageCount();
  }

  drawHeading(text: string, size = 15) {
    this.ensureSpace(size * 2.4);
    this.page.drawText(text, { x: MARGIN_X, y: this.y, size, font: this.fonts.bold, color: this.primary });
    this.y -= size + 8;
    this.page.drawLine({ start: { x: MARGIN_X, y: this.y + 2 }, end: { x: A4[0] - MARGIN_X, y: this.y + 2 }, thickness: 1, color: this.primary });
    this.y -= 10;
  }

  drawSubheading(text: string, size = 12.5) {
    this.ensureSpace(size * 2.2);
    this.page.drawText(text, { x: MARGIN_X, y: this.y, size, font: this.fonts.bold, color: this.secondary });
    this.y -= size + 8;
  }

  drawParagraph(text: string, options?: { size?: number; bold?: boolean; italic?: boolean; center?: boolean; indent?: number; after?: number; color?: ReturnType<typeof rgb> }) {
    const size = options?.size ?? 10.5;
    const font = options?.bold ? this.fonts.bold : options?.italic ? this.fonts.italic : this.fonts.regular;
    const indent = options?.indent ?? 0;
    const maxWidth = A4[0] - MARGIN_X * 2 - indent;
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size * 1.42;
    this.ensureSpace(lines.length * lineHeight + (options?.after ?? 7));
    for (const line of lines) {
      const width = font.widthOfTextAtSize(line, size);
      const x = options?.center ? (A4[0] - width) / 2 : MARGIN_X + indent;
      this.page.drawText(line, { x, y: this.y, size, font, color: options?.color || this.textColor });
      this.y -= lineHeight;
    }
    this.y -= options?.after ?? 7;
  }

  drawContent(content: string) {
    for (const raw of content.replace(/\r/g, "").split("\n")) {
      const line = raw.trim();
      if (!line) {
        this.y -= 6;
        continue;
      }
      const bullet = line.match(/^(?:•|-|–)\s+(.+)$/);
      if (bullet) this.drawParagraph(`• ${bullet[1]}`, { indent: 12, after: 4 });
      else this.drawParagraph(line);
    }
  }

  drawKeyValue(label: string, value: string) {
    const size = 9.7;
    const labelWidth = 120;
    const maxWidth = A4[0] - MARGIN_X * 2 - labelWidth - 12;
    const lines = wrapText(value, this.fonts.regular, size, maxWidth);
    const height = Math.max(22, lines.length * 13 + 8);
    this.ensureSpace(height);
    this.page.drawRectangle({ x: MARGIN_X, y: this.y - height + 5, width: labelWidth, height, color: rgb(0.94, 0.97, 0.97), borderColor: rgb(0.75, 0.81, 0.83), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN_X + labelWidth, y: this.y - height + 5, width: A4[0] - MARGIN_X * 2 - labelWidth, height, borderColor: rgb(0.75, 0.81, 0.83), borderWidth: 0.6 });
    this.page.drawText(label, { x: MARGIN_X + 7, y: this.y - 10, size, font: this.fonts.bold, color: this.secondary });
    let lineY = this.y - 10;
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN_X + labelWidth + 7, y: lineY, size, font: this.fonts.regular, color: this.textColor });
      lineY -= 13;
    }
    this.y -= height;
  }

  drawImage(image: PDFImage, caption: string, details?: string | null) {
    const maxWidth = A4[0] - MARGIN_X * 2;
    const maxHeight = 500;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    this.ensureSpace(height + 70);
    const x = (A4[0] - width) / 2;
    this.page.drawImage(image, { x, y: this.y - height, width, height });
    this.y -= height + 12;
    this.drawParagraph(caption, { bold: true, center: true, size: 9.5, after: 3 });
    if (details) this.drawParagraph(details, { italic: true, center: true, size: 8.7, color: this.muted, after: 12 });
  }
}

function drawCover(page: PDFPage, input: ReportExportInput, fonts: WriterFonts, logo: PDFImage | null) {
  const primary = hexToRgb(input.identity.primaryColor);
  const secondary = hexToRgb(input.identity.secondaryColor);
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.985, 0.99, 0.992) });
  page.drawRectangle({ x: 0, y: A4[1] - 14, width: A4[0], height: 14, color: primary });
  if (logo) {
    const scale = Math.min(190 / logo.width, 85 / logo.height, 1);
    page.drawImage(logo, { x: (A4[0] - logo.width * scale) / 2, y: 670, width: logo.width * scale, height: logo.height * scale });
  } else {
    const office = input.identity.officeName.toUpperCase();
    const width = fonts.bold.widthOfTextAtSize(office, 21);
    page.drawText(office, { x: (A4[0] - width) / 2, y: 710, size: 21, font: fonts.bold, color: primary });
  }
  const main = "LAUDO TÉCNICO PERICIAL";
  page.drawText(main, { x: (A4[0] - fonts.bold.widthOfTextAtSize(main, 24)) / 2, y: 580, size: 24, font: fonts.bold, color: secondary });
  const titleLines = wrapText(input.report.title, fonts.bold, 17, A4[0] - 110);
  let y = 535;
  for (const line of titleLines) {
    page.drawText(line, { x: (A4[0] - fonts.bold.widthOfTextAtSize(line, 17)) / 2, y, size: 17, font: fonts.bold, color: primary });
    y -= 24;
  }
  const facts = [
    `Processo: ${valueOrPlaceholder(input.process.process_number)}`,
    `Comarca: ${valueOrPlaceholder(input.process.district)}`,
    `Vara: ${valueOrPlaceholder(input.process.division)}`,
    `Autor/Requerente: ${valueOrPlaceholder(input.process.plaintiff)}`,
    `Réu/Requerido: ${valueOrPlaceholder(input.process.defendant)}`,
  ];
  y -= 35;
  page.drawRectangle({ x: 72, y: y - 130, width: A4[0] - 144, height: 145, borderColor: primary, borderWidth: 1.2, color: rgb(1, 1, 1) });
  for (const fact of facts) {
    page.drawText(fact, { x: 88, y, size: 10.2, font: fonts.regular, color: secondary });
    y -= 25;
  }
  const place = input.identity.cityState || input.process.district || "";
  page.drawText(place, { x: (A4[0] - fonts.bold.widthOfTextAtSize(place, 11)) / 2, y: 82, size: 11, font: fonts.bold, color: secondary });
  const date = formatLongDate(input.report.report_date);
  page.drawText(date, { x: (A4[0] - fonts.regular.widthOfTextAtSize(date, 10)) / 2, y: 62, size: 10, font: fonts.regular, color: secondary });
}

function drawPageChrome(pdf: PDFDocument, identity: DocumentIdentity, fonts: WriterFonts, logo: PDFImage | null, coverPageIndex: number | null) {
  const primary = hexToRgb(identity.primaryColor);
  const secondary = hexToRgb(identity.secondaryColor);
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    if (coverPageIndex === index) return;
    if (logo && identity.includeLogo) {
      const scale = Math.min(68 / logo.width, 28 / logo.height, 1);
      page.drawImage(logo, { x: MARGIN_X, y: 800, width: logo.width * scale, height: logo.height * scale });
    } else {
      page.drawText(identity.officeName, { x: MARGIN_X, y: 805, size: 8.8, font: fonts.bold, color: primary });
    }
    const header = identity.headerText || identity.officeName;
    const headerWidth = fonts.bold.widthOfTextAtSize(header, 8.5);
    page.drawText(header, { x: A4[0] - MARGIN_X - headerWidth, y: 805, size: 8.5, font: fonts.bold, color: secondary });
    page.drawLine({ start: { x: MARGIN_X, y: 792 }, end: { x: A4[0] - MARGIN_X, y: 792 }, thickness: 0.8, color: primary });
    page.drawLine({ start: { x: MARGIN_X, y: 45 }, end: { x: A4[0] - MARGIN_X, y: 45 }, thickness: 0.6, color: primary });
    const footer = identity.footerText;
    page.drawText(footer, { x: MARGIN_X, y: 29, size: 7.4, font: fonts.regular, color: rgb(0.36, 0.42, 0.47) });
    if (identity.showPageNumbers) {
      const text = `Página ${index + 1} de ${pages.length}`;
      const width = fonts.regular.widthOfTextAtSize(text, 7.4);
      page.drawText(text, { x: A4[0] - MARGIN_X - width, y: 29, size: 7.4, font: fonts.regular, color: rgb(0.36, 0.42, 0.47) });
    }
  });
}

export async function createProfessionalReportPdf(input: ReportExportInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.report.title);
  pdf.setAuthor(input.identity.professionalName || "OCTA Perito");
  pdf.setCreator("OCTA Perito");
  pdf.setSubject("Laudo técnico pericial");
  const fonts: WriterFonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const logo = await embedAsset(pdf, input.identity.includeLogo ? input.identity.logo : null);
  const signature = await embedAsset(pdf, input.identity.includeSignature ? input.identity.signature : null);

  let coverPageIndex: number | null = null;
  if (input.identity.showCover) {
    const cover = pdf.addPage(A4);
    coverPageIndex = 0;
    drawCover(cover, input, fonts, logo);
  }

  const tocLabels = [
    "Identificação do processo",
    ...input.sections.filter((item) => item.is_enabled).sort((a, b) => a.sort_order - b.sort_order).map((item) => item.title),
    ...(input.questions.length ? ["Quesitos e respostas"] : []),
    ...(input.sources.length ? ["Documentos e fontes analisadas"] : []),
    ...(input.equipment.length ? ["Equipamentos utilizados"] : []),
    ...(input.attachments.length ? ["Registro fotográfico e anexos"] : []),
  ];
  const tocPageCount = input.identity.showTableOfContents ? Math.max(1, Math.ceil(tocLabels.length / 30)) : 0;
  const tocPages: PDFPage[] = [];
  for (let i = 0; i < tocPageCount; i += 1) tocPages.push(pdf.addPage(A4));

  const contentStart = pdf.addPage(A4);
  const writer = new PdfWriter(pdf, fonts, input.identity, contentStart);
  const tocEntries: Array<{ label: string; page: number }> = [];

  tocEntries.push({ label: "Identificação do processo", page: writer.currentPageNumber() });
  writer.drawHeading("IDENTIFICAÇÃO DO PROCESSO");
  writer.drawKeyValue("Processo", valueOrPlaceholder(input.process.process_number));
  writer.drawKeyValue("Tribunal", valueOrPlaceholder(input.process.court));
  writer.drawKeyValue("Comarca", valueOrPlaceholder(input.process.district));
  writer.drawKeyValue("Vara", valueOrPlaceholder(input.process.division));
  writer.drawKeyValue("Classe processual", valueOrPlaceholder(input.process.case_class));
  writer.drawKeyValue("Autor/Requerente", valueOrPlaceholder(input.process.plaintiff));
  writer.drawKeyValue("Réu/Requerido", valueOrPlaceholder(input.process.defendant));
  writer.drawKeyValue("Objeto", valueOrPlaceholder(input.process.subject));
  writer.drawKeyValue("Perito", valueOrPlaceholder(input.identity.professionalName));
  writer.drawKeyValue("Registro", valueOrPlaceholder(input.identity.councilRegistration));
  writer.y -= 12;

  for (const section of input.sections.filter((item) => item.is_enabled).sort((a, b) => a.sort_order - b.sort_order)) {
    tocEntries.push({ label: section.title, page: writer.currentPageNumber() });
    writer.drawHeading(section.title.toUpperCase());
    writer.drawContent(section.content.trim() || "[INFORMAÇÃO NÃO PREENCHIDA]");
  }

  if (input.questions.length) {
    tocEntries.push({ label: "Quesitos e respostas", page: writer.currentPageNumber() });
    writer.drawHeading("QUESITOS E RESPOSTAS");
    const grouped = new Map<string, typeof input.questions>();
    for (const question of [...input.questions].sort((a, b) => a.sort_order - b.sort_order)) {
      const origin = questionOriginLabel(question.origin, question.origin_label);
      grouped.set(origin, [...(grouped.get(origin) || []), question]);
    }
    for (const [origin, questions] of grouped) {
      writer.drawSubheading(origin.toUpperCase());
      for (const item of questions) {
        writer.drawParagraph(`${item.question_number ? `${item.question_number}. ` : ""}${item.question}`, { bold: true, after: 4 });
        writer.drawParagraph(`Resposta: ${item.answer.trim() || "[RESPOSTA NÃO PREENCHIDA]"}`);
      }
    }
  }

  if (input.sources.length) {
    tocEntries.push({ label: "Documentos e fontes analisadas", page: writer.currentPageNumber() });
    writer.drawHeading("DOCUMENTOS E FONTES ANALISADAS");
    for (const source of [...input.sources].sort((a, b) => a.sort_order - b.sort_order)) {
      const details = [sourceTypeLabel(source.source_type), source.reference_label, source.source_date ? formatLongDate(source.source_date) : null].filter(Boolean).join(" · ");
      writer.drawParagraph(`${source.title}${details ? ` — ${details}` : ""}`, { bold: true, after: 4 });
      if (source.description) writer.drawParagraph(source.description);
    }
  }

  if (input.equipment.length) {
    tocEntries.push({ label: "Equipamentos utilizados", page: writer.currentPageNumber() });
    writer.drawHeading("EQUIPAMENTOS UTILIZADOS");
    for (const item of [...input.equipment].sort((a, b) => a.sort_order - b.sort_order)) {
      const identification = [item.brand, item.model, item.serial_number ? `S/N ${item.serial_number}` : null].filter(Boolean).join(" · ");
      writer.drawParagraph(`${item.name}${identification ? ` — ${identification}` : ""}`, { bold: true, after: 4 });
      if (item.calibration_certificate) writer.drawParagraph(`Certificado de calibração: ${item.calibration_certificate}`);
      if (item.calibration_date || item.calibration_due_date) writer.drawParagraph(`Calibração: ${item.calibration_date ? formatLongDate(item.calibration_date) : "não informada"} · Validade: ${item.calibration_due_date ? formatLongDate(item.calibration_due_date) : "não informada"}`);
      if (item.usage_description) writer.drawParagraph(item.usage_description);
    }
  }

  if (input.attachments.length) {
    tocEntries.push({ label: "Registro fotográfico e anexos", page: writer.currentPageNumber() });
    writer.drawHeading("REGISTRO FOTOGRÁFICO E ANEXOS");
    let number = 0;
    for (const attachment of [...input.attachments].sort((a, b) => a.sort_order - b.sort_order)) {
      const image = await embedAsset(pdf, attachment.asset);
      if (image) {
        number += 1;
        const details = [attachment.description, attachment.location_text, attachment.captured_at ? formatLongDate(attachment.captured_at.slice(0, 10)) : null].filter(Boolean).join(" · ");
        writer.drawImage(image, `Figura ${number} — ${attachment.caption || attachment.original_name}`, details || null);
      } else {
        writer.drawParagraph(`Anexo — ${attachment.caption || attachment.original_name}`, { bold: true, after: 4 });
        const details = [attachment.description, attachment.location_text, attachment.captured_at ? formatLongDate(attachment.captured_at.slice(0, 10)) : null].filter(Boolean).join(" · ");
        if (details) writer.drawParagraph(details);
      }
    }
  }

  writer.ensureSpace(180);
  writer.y -= 45;
  if (signature) {
    const scale = Math.min(180 / signature.width, 75 / signature.height, 1);
    writer.page.drawImage(signature, { x: (A4[0] - signature.width * scale) / 2, y: writer.y - signature.height * scale, width: signature.width * scale, height: signature.height * scale });
    writer.y -= signature.height * scale + 8;
  }
  writer.page.drawLine({ start: { x: 175, y: writer.y }, end: { x: A4[0] - 175, y: writer.y }, thickness: 0.8, color: writer.secondary });
  writer.y -= 17;
  writer.drawParagraph(input.identity.professionalName.toUpperCase(), { bold: true, center: true, after: 2 });
  if (input.identity.professionalTitles) writer.drawParagraph(input.identity.professionalTitles, { center: true, size: 9, after: 2 });
  if (input.identity.councilRegistration) writer.drawParagraph(input.identity.councilRegistration, { center: true, size: 9, after: 2 });

  if (tocPageCount) {
    let entryIndex = 0;
    tocPages.forEach((page, tocIndex) => {
      page.drawText("SUMÁRIO", { x: MARGIN_X, y: CONTENT_TOP, size: 17, font: fonts.bold, color: hexToRgb(input.identity.primaryColor) });
      page.drawLine({ start: { x: MARGIN_X, y: CONTENT_TOP - 10 }, end: { x: A4[0] - MARGIN_X, y: CONTENT_TOP - 10 }, thickness: 1, color: hexToRgb(input.identity.primaryColor) });
      let y = CONTENT_TOP - 35;
      const end = Math.min(entryIndex + 30, tocEntries.length);
      for (; entryIndex < end; entryIndex += 1) {
        const entry = tocEntries[entryIndex];
        const label = entry.label;
        const pageText = String(entry.page);
        page.drawText(label, { x: MARGIN_X, y, size: 10, font: fonts.regular, color: rgb(0.12, 0.16, 0.19) });
        page.drawText(pageText, { x: A4[0] - MARGIN_X - fonts.regular.widthOfTextAtSize(pageText, 10), y, size: 10, font: fonts.regular, color: rgb(0.12, 0.16, 0.19) });
        y -= 22;
      }
      if (tocIndex + 1 < tocPages.length) page.drawText("Continua...", { x: MARGIN_X, y: 65, size: 8, font: fonts.italic, color: rgb(0.36, 0.42, 0.47) });
    });
  }

  drawPageChrome(pdf, input.identity, fonts, logo, coverPageIndex);
  return pdf.save();
}

export async function createProfessionalTextPdf(input: { title: string; content: string; identity: DocumentIdentity }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  pdf.setAuthor(input.identity.professionalName || "OCTA Perito");
  pdf.setCreator("OCTA Perito");
  const fonts: WriterFonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const logo = await embedAsset(pdf, input.identity.includeLogo ? input.identity.logo : null);
  const signature = await embedAsset(pdf, input.identity.includeSignature ? input.identity.signature : null);
  const page = pdf.addPage(A4);
  const writer = new PdfWriter(pdf, fonts, input.identity, page);
  writer.drawHeading(input.title.toUpperCase());
  writer.drawContent(input.content);
  writer.ensureSpace(180);
  writer.y -= 45;
  if (signature) {
    const scale = Math.min(180 / signature.width, 75 / signature.height, 1);
    writer.page.drawImage(signature, { x: (A4[0] - signature.width * scale) / 2, y: writer.y - signature.height * scale, width: signature.width * scale, height: signature.height * scale });
    writer.y -= signature.height * scale + 8;
  }
  writer.page.drawLine({ start: { x: 175, y: writer.y }, end: { x: A4[0] - 175, y: writer.y }, thickness: 0.8, color: writer.secondary });
  writer.y -= 17;
  writer.drawParagraph(input.identity.professionalName.toUpperCase(), { bold: true, center: true, after: 2 });
  if (input.identity.professionalTitles) writer.drawParagraph(input.identity.professionalTitles, { center: true, size: 9, after: 2 });
  if (input.identity.councilRegistration) writer.drawParagraph(input.identity.councilRegistration, { center: true, size: 9, after: 2 });
  drawPageChrome(pdf, input.identity, fonts, logo, null);
  return pdf.save();
}
