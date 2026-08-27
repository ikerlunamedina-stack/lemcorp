"use client";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Aurora loading animation */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Anillos giratorios */}
        <div
          className="absolute h-full w-full rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "oklch(0.55 0.20 165)",
            borderRightColor: "oklch(0.50 0.22 300)",
            animation: "lem-aurora-rotate 1.2s linear infinite",
          }}
        />
        <div
          className="absolute h-24 w-24 rounded-full border-4 border-transparent"
          style={{
            borderBottomColor: "oklch(0.65 0.18 200)",
            borderLeftColor: "oklch(0.55 0.20 165)",
            animation: "lem-aurora-rotate 1.8s linear infinite reverse",
          }}
        />
        <div
          className="absolute h-16 w-16 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "oklch(0.50 0.22 300)",
            borderBottomColor: "oklch(0.65 0.18 200)",
            animation: "lem-aurora-rotate 0.9s linear infinite",
          }}
        />
        {/* Logo en el centro */}
        <img
          src="/lemcorp-logo.png"
          alt="LEMCORP"
          className="h-10 w-10 rounded-lg object-contain"
          style={{ animation: "lem-aurora-breath 2s ease-in-out infinite" }}
        />
      </div>
      {/* Glow debajo */}
      <div
        className="mt-2 h-3 w-32 rounded-full"
        style={{
          background: "radial-gradient(ellipse, oklch(0.55 0.20 165 / 0.4), transparent)",
          animation: "lem-aurora-pulse 2s ease-in-out infinite",
        }}
      />
      <span
        className="mt-4 text-[13px] font-semibold text-muted-foreground"
        style={{ animation: "lem-aurora-breath 2s ease-in-out infinite" }}
      >
        Cargando...
      </span>
    </div>
  );
}
