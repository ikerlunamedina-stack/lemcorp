import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/lem/theme-provider";

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
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script: aplica el tema oscuro/claro antes de pintar para evitar FOUC.
  // Default es oscuro; respeta lo guardado por el usuario en localStorage.
  const themeScript = `(function(){try{var raw=localStorage.getItem('lemcorp-v3');var tema='oscuro';if(raw){var s=JSON.parse(raw);tema=(s&&s.state&&s.state.settings&&s.state.settings.tema)||'oscuro';}var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=tema==='oscuro'||(tema==='sistema'&&prefersDark);var root=document.documentElement;if(isDark){root.classList.add('dark');root.classList.remove('light');}else{root.classList.remove('dark');root.classList.add('light');}}catch(e){document.documentElement.classList.add('dark');}})();`;

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
