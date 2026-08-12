import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "LEMCORP · Gestor de Excel",
  description:
    "Sistema centralizado de gestión de planillas para almacén de telecomunicaciones. Inventario, despachos y equipos en un solo lugar.",
  keywords: [
    "LEMCORP",
    "gestor excel",
    "inventario",
    "despachos",
    "equipos telecom",
  ],
  authors: [{ name: "LEMCORP" }],
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
