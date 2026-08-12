// Tipos centrales de LEMCORP Gestor de Excel

export type FileTag = "inventario" | "despachos" | "equipos" | "otro";

export const TAG_META: Record<
  FileTag,
  { label: string; short: string; icon: string; hint: string }
> = {
  inventario: {
    label: "Inventario total",
    short: "Inventario",
    icon: "📦",
    hint: "Stock general de productos y materiales",
  },
  despachos: {
    label: "Despachos diarios",
    short: "Despachos",
    icon: "🚚",
    hint: "Salidas de mercadería del día",
  },
  equipos: {
    label: "Equipos",
    short: "Equipos",
    icon: "🛠️",
    hint: "Equipos averiados, en retiro, etc.",
  },
  otro: {
    label: "Otro",
    short: "Otro",
    icon: "📄",
    hint: "Archivo sin clasificar",
  },
};

// Clave de celda: `${row},${col}` con base 0 (fila 0 = primera fila de datos)
export interface SheetFile {
  id: string;
  name: string;
  tag: FileTag;
  tagConfirmed: boolean;
  rowCount: number;
  colCount: number;
  cells: Record<string, string>; // raw value (puede ser fórmula con =)
  createdAt: number;
  updatedAt: number;
}

export interface HistorySnapshot {
  cells: Record<string, string>;
  rowCount: number;
  colCount: number;
  label: string;
  ts: number;
}

export type ActiveView = "editor" | "resumen" | "equipos";
