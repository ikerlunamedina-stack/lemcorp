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
  // Ancho por columna (en px). Si no está, usa COL_W por defecto.
  colWidths?: Record<number, number>;
  // Alto por fila (en px). Si no está, usa ROW_H por defecto.
  rowHeights?: Record<number, number>;
  // Estilos por celda: clave `${row},${col}` -> CellStyle
  cellStyles?: Record<string, CellStyle>;
  // Si el archivo tiene múltiples hojas (como un Excel real), aquí se guardan.
  // sheetIndex indica qué hoja está activa en el editor.
  sheets?: SheetTab[];
  activeSheetIndex?: number;
  createdAt: number;
  updatedAt: number;
}

// Una hoja/pestaña dentro de un archivo multi-hoja (tipo Excel).
export interface SheetTab {
  name: string; // nombre de la pestaña (ej: "Stock", "Pegar Despachos")
  rowCount: number;
  colCount: number;
  cells: Record<string, string>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  cellStyles?: Record<string, CellStyle>;
}

// Estilo de una celda (formato visual tipo Excel).
export interface CellStyle {
  bg?: string; // color de fondo (hex)
  color?: string; // color de texto (hex)
  bold?: boolean;
  italic?: boolean;
  fontSize?: number; // px
  align?: "left" | "center" | "right";
}

export interface HistorySnapshot {
  cells: Record<string, string>;
  rowCount: number;
  colCount: number;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  cellStyles?: Record<string, CellStyle>;
  label: string;
  ts: number;
}

// Producto del catálogo maestro de LEMCORP.
// El SKU es el identificador único (el "DNI" del producto).
export interface Product {
  id: string;
  sku: string; // código único, ej. "4076358"
  name: string; // nombre canónico, ej. "ROUTER ONT HG8145X6-13 HUAWEI"
  category?: string; // categoría opcional, ej. "Router", "ONT", "Cable"
  quantity: number; // stock actual (se descuenta con despachos)
  minStock?: number; // stock mínimo para alertas
  udm?: string; // unidad de medida (UNIDADES, METROS, etc.)
  createdAt: number;
  updatedAt: number;
}

// Despacho registrado en el sistema.
export interface Despacho {
  id: string;
  fecha: number; // timestamp del despacho
  sku: string;
  producto: string;
  cantidad: number;
  cliente?: string;
  tecnico?: string;
  guia?: string;
  observacion?: string;
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
  highlightDuplicates: boolean; // resaltar valores duplicados en el editor
}

export const DEFAULT_SETTINGS: Settings = {
  skuDetection: true,
  lowStockAlerts: true,
  automation: true,
  highlightDuplicates: false,
};

export type ActiveView =
  | "dashboard"
  | "inventario"
  | "despachos"
  | "config";
