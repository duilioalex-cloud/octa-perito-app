import { formatLongDateInBrasilia } from "@/lib/datetime";

export type BrandAsset = {
  data: Uint8Array;
  mimeType: string;
  name?: string | null;
};

export type DocumentIdentity = {
  officeName: string;
  professionalName: string;
  professionalTitles: string;
  councilRegistration: string;
  contactLine: string;
  cityState: string;
  headerText: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
  showCover: boolean;
  showTableOfContents: boolean;
  showPageNumbers: boolean;
  includeLogo: boolean;
  includeSignature: boolean;
  logo: BrandAsset | null;
  signature: BrandAsset | null;
};

export type DocumentSettingsRow = {
  office_name?: string | null;
  professional_name?: string | null;
  professional_titles?: string | null;
  council_registration?: string | null;
  contact_line?: string | null;
  city_state?: string | null;
  header_text?: string | null;
  footer_text?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  show_cover?: boolean | null;
  show_table_of_contents?: boolean | null;
  show_page_numbers?: boolean | null;
  include_logo?: boolean | null;
  include_signature?: boolean | null;
  logo_bucket?: string | null;
  logo_path?: string | null;
  logo_name?: string | null;
  logo_mime_type?: string | null;
  signature_bucket?: string | null;
  signature_path?: string | null;
  signature_name?: string | null;
  signature_mime_type?: string | null;
};

export type ProfileIdentityRow = {
  full_name?: string | null;
  professional_title?: string | null;
  council?: string | null;
  council_number?: string | null;
  phone?: string | null;
};

function cleanHex(value: string | null | undefined, fallback: string) {
  const normalized = String(value || "").replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

export function buildDocumentIdentity(input: {
  organizationName: string;
  settings?: DocumentSettingsRow | null;
  profile?: ProfileIdentityRow | null;
  logo?: BrandAsset | null;
  signature?: BrandAsset | null;
}): DocumentIdentity {
  const settings = input.settings || {};
  const profile = input.profile || {};
  const councilFallback = [profile.council, profile.council_number].filter(Boolean).join(" ");
  return {
    officeName: settings.office_name?.trim() || input.organizationName,
    professionalName: settings.professional_name?.trim() || profile.full_name?.trim() || "Profissional responsável",
    professionalTitles: settings.professional_titles?.trim() || profile.professional_title?.trim() || "",
    councilRegistration: settings.council_registration?.trim() || councilFallback,
    contactLine: settings.contact_line?.trim() || profile.phone?.trim() || "",
    cityState: settings.city_state?.trim() || "",
    headerText: settings.header_text?.trim() || settings.office_name?.trim() || input.organizationName,
    footerText: settings.footer_text?.trim() || settings.contact_line?.trim() || "Documento técnico emitido pelo OCTA Perito",
    primaryColor: cleanHex(settings.primary_color, "1F7A6D"),
    secondaryColor: cleanHex(settings.secondary_color, "0B1C2D"),
    showCover: settings.show_cover ?? true,
    showTableOfContents: settings.show_table_of_contents ?? true,
    showPageNumbers: settings.show_page_numbers ?? true,
    includeLogo: settings.include_logo ?? true,
    includeSignature: settings.include_signature ?? true,
    logo: input.logo || null,
    signature: input.signature || null,
  };
}

export function formatLongDate(value?: string | null) {
  return formatLongDateInBrasilia(value, value || "");
}

export function valueOrPlaceholder(value: string | null | undefined) {
  return value?.trim() || "[INFORMAÇÃO NÃO PREENCHIDA]";
}
