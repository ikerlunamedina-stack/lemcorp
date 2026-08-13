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

// Producto del catálogo maestro de LEMCORP.
// El SKU es el identificador único (el "DNI" del producto).
export interface Product {
  id: string;
  sku: string; // código único, ej. "4076358"
  name: string; // nombre canónico, ej. "ROUTER ONT HG8145X6-13 HUAWEI"
  quantity?: number; // cantidad / stock registrado en el catálogo
  createdAt: number;
  updatedAt: number;
}

// Discrepancia detectada al cruzar archivos contra el catálogo maestro.
export interface Mismatch {
  fileId: string;
  fileName: string;
  fileTag: FileTag;
  row: number; // fila en el archivo (base 0)
  sku: string;
  expectedName: string; // nombre canónico del catálogo
  actualName: string; // nombre que aparece en el archivo
}

// Configuración global de la aplicación (persistente).
export interface Settings {
  skuDetection: boolean; // validar SKUs de archivos contra catálogo
  lowStockAlerts: boolean; // alertar bajo stock
  automation: boolean; // despachos -> inventario automático
}

export const DEFAULT_SETTINGS: Settings = {
  skuDetection: true,
  lowStockAlerts: true,
  automation: true,
};

export type ActiveView =
  | "editor"
  | "resumen"
  | "equipos"
  | "productos"
  | "config"
  | "series";
