import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "LEMCORP — Sistema de Gestión de Almacén | WMS",
  description:
    "Plataforma WMS para gestión de inventarios, trazabilidad de equipos por serie, control de entradas y análisis con IA. Diseñado para telecomunicaciones.",
  keywords: [
    "LEMCORP",
    "WMS",
    "sistema de almacén",
    "gestión de inventarios",
    "trazabilidad de equipos",
    "control de stock",
    "inventario telecomunicaciones",
    "software logística",
    "asistente IA almacén",
  ],
  authors: [{ name: "LEMCORP" }],
  creator: "LEMCORP",
  publisher: "LEMCORP",
  robots: { index: true, follow: true },
  openGraph: {
    title: "LEMCORP — Sistema de Gestión de Almacén",
    description: "Control total de tu inventario, equipos y operaciones.",
    siteName: "LEMCORP WMS",
    type: "website",
    locale: "es_PE",
  },
  twitter: {
    card: "summary_large_image",
    title: "LEMCORP WMS",
    description: "Sistema de gestión de almacén con IA integrada.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
