import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Headers para prevenir cache del navegador — fuerza al navegador a descargar
  // siempre el HTML y JS del servidor. Crítico para que el inline script de cleanup
  // del chat se ejecute SIEMPRE, sin importar el cache del navegador del usuario.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
