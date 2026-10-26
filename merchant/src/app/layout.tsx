import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/imeiau.png", apple: "/imeiau.png" },
  title: "IMEIAU · Painel do lojista",
  description: "Gestão de trade-in, preços e inspeções.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
