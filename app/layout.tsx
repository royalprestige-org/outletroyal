import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outlet de artículos de cocina | Los Cabos",
  description: "Descubre artículos de cocina, consulta precios y promociones, y recibe asesoría personalizada por WhatsApp en Los Cabos.",
  openGraph: {
    title: "Outlet de artículos de cocina | Los Cabos",
    description: "Explora nuestra colección, elige tus favoritos y envíanos tu selección por WhatsApp. Asesoría personalizada y entrega a domicilio.",
    type: "website",
    locale: "es_MX",
    siteName: "Outlet de artículos de cocina",
  },
  twitter: {
    card: "summary",
    title: "Outlet de artículos de cocina | Los Cabos",
    description: "Explora productos y promociones para tu cocina. Elige tus favoritos y contáctanos por WhatsApp.",
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
