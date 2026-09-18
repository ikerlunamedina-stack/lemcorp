import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/lem/theme-provider";
import { SplashScreen } from "@/components/lem/splash-screen";

export const metadata: Metadata = {
  title: "VRS — Resource Management Platform",
  description:
    "Plataforma para gestión de recursos, trazabilidad de equipos por serie, control de entradas y análisis con IA.",
  keywords: [
    "VRS",
    "Resource Management",
    "sistema de almacén",
    "software logística",
    "asistente IA almacén",
  ],
  authors: [{ name: "VRS" }],
  creator: "VRS",
  publisher: "VRS",
  robots: { index: true, follow: true },
  openGraph: {
    title: "VRS — Resource Management Platform",
    description: "Control total de tus recursos, equipos y operaciones.",
    siteName: "VRS",
    type: "website",
    locale: "es_PE",
  },
  twitter: {
    card: "summary_large_image",
    title: "VRS",
    description: "Resource Management Platform con IA integrada.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script: aplica el tema oscuro/claro antes de pintar para evitar FOUC.
  // Default es oscuro; respeta lo guardado por el usuario en localStorage.
  const themeScript = `(function(){try{var raw=localStorage.getItem('lemcorp-v3');var tema='claro';if(raw){var s=JSON.parse(raw);tema=(s&&s.state&&s.state.settings&&s.state.settings.tema)||'claro';}var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=tema==='oscuro'||(tema==='sistema'&&prefersDark);var root=document.documentElement;if(isDark){root.classList.add('dark');root.classList.remove('light');}else{root.classList.remove('dark');root.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();`;

  // Inline script CRÍTICO: limpieza agresiva de caches viejos de chat con respuestas de Wikipedia.
  // Se ejecuta en el HTML antes que cualquier bundle JS — garantiza que aun si el navegador
  // tiene el bundle JS cacheado, los datos viejos con respuestas de Wikipedia se eliminan.
  // VERSIÓN 2: también detecta conversaciones con "(Fuente: Wikipedia)" DENTRO del cache v3
  // actual y si las encuentra, las elimina. Esto cubre el caso en que el usuario ya tenía
  // la versión v3 con respuestas de Wikipedia inyectadas por un bundle JS viejo intermedio.
  const cleanupChatScript = `(function(){try{var KEEP='nuclon-ia-chat-v3';var removed=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k)continue;if((/^nuclon-ia-chat-v\\d+$/.test(k)||k.indexOf('ia-chat')>=0)&&k!==KEEP){removed.push(k);}}for(var j=0;j<removed.length;j++){localStorage.removeItem(removed[j]);}if(removed.length>0){console.info('[ALANA-CLEANUP] Eliminados caches viejos:',removed);}var raw=localStorage.getItem(KEEP);if(raw){try{var parsed=JSON.parse(raw);if(parsed&&Array.isArray(parsed.messages)){var orig=parsed.messages.length;var clean=parsed.messages.filter(function(m){return m&&typeof m.content==='string'&&m.content.indexOf('Fuente: Wikipedia')<0;});if(clean.length!==orig){parsed.messages=clean;localStorage.setItem(KEEP,JSON.stringify(parsed));console.info('[ALANA-CLEANUP] Filtrados',(orig-clean.length),'mensajes con Wikipedia del cache v3 actual');}}}catch(e2){}}}catch(e){}})();`;

  return (
    <html lang="es" className="light" suppressHydrationWarning>
      <head>
        {/* Meta tags para prohibir cache del navegador — fuerza al navegador a descargar
            siempre el HTML y JS del servidor. Combinado con los headers HTTP de next.config.ts,
            esto garantiza que el inline script de cleanup se ejecute SIEMPRE. */}
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* Limpieza agresiva de caches viejos con Wikipedia — debe ir PRIMERO */}
        <script dangerouslySetInnerHTML={{ __html: cleanupChatScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased font-sans" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
        <SplashScreen />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
