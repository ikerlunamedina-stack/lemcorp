// Tipos del sistema de control de almacén LEMCORP

export type ActiveView =
  | "dashboard"
  | "inventario"
  | "equipos"
  | "bloc"
  | "config";

// Producto en el inventario (controlado por SKU + stock)
export interface Product {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minStock?: number;
  udm?: string;
  createdAt: number;
  updatedAt: number;
}

// Equipo individual rastreado por serie
export interface Equipment {
  id: string;
  serie: string;
  modelo: string;
  estado: EstadoEquipo;
  ubicacion?: string;
  observacion?: string;
  createdAt: number;
  updatedAt: number;
}

export type EstadoEquipo =
  | "disponible"
  | "averiado"
  | "en_retiro"
  | "en_reparacion";

export const ESTADO_META: Record<EstadoEquipo, { label: string; short: string; icon: string }> = {
  disponible: { label: "Disponible", short: "Disponible", icon: "✓" },
  averiado: { label: "Averiado", short: "Averiado", icon: "✕" },
  en_retiro: { label: "En retiro", short: "Retiro", icon: "↩" },
  en_reparacion: { label: "En reparación", short: "Reparación", icon: "🔧" },
};

// Registro de entrada al almacén (formato SKU*cantidad)
export interface Entrada {
  id: string;
  fecha: number;
  sku: string;
  producto: string;
  cantidad: number;
  observacion?: string;
}

// Nota del bloc (recordatorios y apuntes rápidos)
export interface Nota {
  id: string;
  texto: string;
  fecha: number;
  pinned: boolean;
}

// Configuración del sistema
export interface Settings {
  lowStockAlerts: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lowStockAlerts: true,
};

// Helper para generar IDs
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
