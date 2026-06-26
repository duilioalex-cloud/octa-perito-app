import type { BrandAsset, DocumentIdentity } from "@/lib/document-identity";

export type ReportRow = {
  title: string;
  report_date: string | null;
  notes?: string | null;
};

export type ProcessRow = {
  process_number: string;
  court: string | null;
  district: string | null;
  division: string | null;
  case_class: string | null;
  plaintiff: string | null;
  defendant: string | null;
  subject: string | null;
};

export type SectionRow = {
  title: string;
  content: string;
  is_enabled: boolean;
  sort_order: number;
};

export type QuestionRow = {
  origin: string;
  origin_label: string | null;
  question_number: string | null;
  question: string;
  answer: string;
  answer_status: string;
  sort_order: number;
};

export type SourceRow = {
  source_type: string;
  title: string;
  reference_label: string | null;
  description: string | null;
  source_date: string | null;
  sort_order: number;
};

export type EquipmentRow = {
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

export type AttachmentRow = {
  id?: string;
  file_type: string;
  original_name: string;
  caption: string | null;
  description: string | null;
  location_text: string | null;
  captured_at: string | null;
  sort_order: number;
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
};

export type ExportAttachment = AttachmentRow & {
  asset: BrandAsset | null;
};

export type ReportExportInput = {
  report: ReportRow;
  process: ProcessRow;
  sections: SectionRow[];
  questions: QuestionRow[];
  sources: SourceRow[];
  equipment: EquipmentRow[];
  attachments: ExportAttachment[];
  identity: DocumentIdentity;
};
