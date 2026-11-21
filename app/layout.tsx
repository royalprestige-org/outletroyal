import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artículos de cocina | Compra Tradicional y Outlet",
  description: "Explora artículos de cocina, compara modalidades de compra, consulta precios y solicita asesoría personalizada por WhatsApp.",
  openGraph: {
    title: "Artículos de cocina | Compra Tradicional y Outlet",
    description: "Explora el catálogo, compara formas de pago y consulta asesoría personalizada por WhatsApp.",
    type: "website",
    locale: "es_MX",
    siteName: "Tienda de artículos de cocina",
  },
  twitter: {
    card: "summary",
    title: "Artículos de cocina | Compra Tradicional y Outlet",
    description: "Encuentra artículos de cocina y revisa Compra Tradicional y promociones Outlet vigentes.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">{children}</body>
    </html>
  );
}
