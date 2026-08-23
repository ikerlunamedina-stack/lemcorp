// Utilidades de fecha/hora en zona horaria de Lima (America/Lima, UTC-5)

const LIMA_TZ = "America/Lima";

export function fmtFechaLima(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PE", { timeZone: LIMA_TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtFechaCortaLima(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PE", { timeZone: LIMA_TZ, day: "2-digit", month: "short", year: "numeric" });
}

export function fmtHoraLima(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-PE", { timeZone: LIMA_TZ, hour: "2-digit", minute: "2-digit" });
}

export function fmtFechaHoraLima(ts: number): string {
  return `${fmtFechaCortaLima(ts)} · ${fmtHoraLima(ts)}`;
}

export function fmtDiaSemanaLima(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PE", { timeZone: LIMA_TZ, weekday: "long" });
}

export function esMismoDiaLima(a: number, b: number): boolean {
  const da = new Date(a).toLocaleDateString("en-CA", { timeZone: LIMA_TZ });
  const db = new Date(b).toLocaleDateString("en-CA", { timeZone: LIMA_TZ });
  return da === db;
}

export function tiempoRelativoLima(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return fmtFechaCortaLima(ts);
}
