import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OCTA Perito", template: "%s | OCTA Perito" },
  description: "Gestão, método e produção documental para profissionais da perícia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" style={{ colorScheme: "dark" }}>
      <head><meta name="color-scheme" content="dark" /></head>
      <body>{children}</body>
    </html>
  );
}
