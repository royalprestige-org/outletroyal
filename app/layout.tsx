import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tienda Outlet Los Cabos | Royal Prestige",
  description: "Descubre productos Royal Prestige para tu cocina, consulta precios y promociones, y recibe asesoría personalizada por WhatsApp en Los Cabos.",
  openGraph: {
    title: "Tienda Outlet Los Cabos | Royal Prestige",
    description: "Explora nuestra colección, elige tus favoritos y envíanos tu selección por WhatsApp. Asesoría personalizada y entrega a domicilio.",
    type: "website",
    locale: "es_MX",
    siteName: "Tienda Outlet Los Cabos",
  },
  twitter: {
    card: "summary",
    title: "Tienda Outlet Los Cabos | Royal Prestige",
    description: "Explora productos y promociones Royal Prestige. Elige tus favoritos y contáctanos por WhatsApp.",
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
