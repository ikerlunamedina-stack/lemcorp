// Utilidad para parsear números en formato español.
// Maneja:
//   "2,768.00"  -> 2768  (coma = miles, punto = decimal)
//   "2.768,00"  -> 2768  (punto = miles, coma = decimal)
//   "2768"      -> 2768
//   "2,5"       -> 2.5   (coma = decimal cuando no hay punto)
//   "" / "abc"  -> NaN
//
// Heurística: si tiene tanto coma como punto, el último separador es el decimal.

export function parseNum(v: unknown): number {
  if (typeof v === "number") return isNaN(v) ? NaN : v;
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  // quitar símbolos de moneda y espacios
  s = s.replace(/[Ss]\//g, "").replace(/[$€¥]/g, "").replace(/\s/g, "");
  // quitar signo negativo temporalmente
  let neg = false;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    // el último separador es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // coma decimal: quitar puntos, coma -> punto
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // punto decimal: quitar comas
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // solo coma. Si es un único separador en posición decimal (1 o 2 dígitos
    // después) -> decimal; si no, es separador de miles
    const parts = s.split(",");
    if (parts.length === 2) {
      const dec = parts[1];
      if (dec.length === 3 && parts[0].length >= 1 && parts[0] !== "0") {
        // ej. "2,768" -> miles -> 2768
        normalized = parts[0] + dec;
      } else {
        // ej. "2,5" o "2,50" -> decimal
        normalized = parts[0] + "." + dec;
      }
    } else {
      // múltiples comas -> todas son miles
      normalized = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    // solo punto. Si hay múltiples puntos -> miles. Si uno solo con 3 dígitos
    // exactos después y parte entera larga -> miles.
    const parts = s.split(".");
    if (parts.length > 2) {
      // múltiples puntos -> separador de miles
      normalized = parts.join("");
    } else if (parts.length === 2) {
      const dec = parts[1];
      if (dec.length === 3 && parts[0].length >= 1) {
        // ambiguo "2.768" -> interpretamos como miles (común en es-ES)
        normalized = parts[0] + dec;
      } else {
        // decimal normal "2.5"
        normalized = s;
      }
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }
  const n = parseFloat(normalized);
  if (isNaN(n)) return NaN;
  return neg ? -n : n;
}

// Formatea un número para mostrarlo en español (2 decimales si no es entero).
export function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("es-PE");
  return n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
