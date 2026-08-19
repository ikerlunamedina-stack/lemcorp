// Tipos del sistema de control de almacén LEMCORP

export type ActiveView =
  | "dashboard"
  | "inventario"
  | "equipos"
  | "series"
  | "bloc"
  | "ia"
  | "empresa"
  | "config";

// Producto en el inventario
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

// Registro de entrada al almacén
export interface Entrada {
  id: string;
  fecha: number;
  sku: string;
  producto: string;
  cantidad: number;
  observacion?: string;
}

// Nota del bloc
export interface Nota {
  id: string;
  texto: string;
  fecha: number;
  pinned: boolean;
}

// Miembro del equipo LEMCORP
export type Rol = "jefe_operaciones" | "supervisor" | "tecnico" | "almacenero" | "administrador";

export const ROL_META: Record<Rol, { label: string; short: string }> = {
  jefe_operaciones: { label: "Jefe de Operaciones", short: "Jefe Op." },
  supervisor: { label: "Supervisor", short: "Supervisor" },
  tecnico: { label: "Técnico de Campo", short: "Técnico" },
  almacenero: { label: "Almacenero", short: "Almacenero" },
  administrador: { label: "Administrador del Sistema", short: "Admin" },
};

export interface MiembroEquipo {
  id: string;
  nombre: string;
  rol: Rol;
  correo?: string;
  telefono?: string;
  activo: boolean;
}

// Información de la empresa
export interface InfoEmpresa {
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  descripcion?: string;
}

// Configuración del sistema
export interface Settings {
  lowStockAlerts: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lowStockAlerts: true,
};

// Helper
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Datos iniciales de empresa (editables por el usuario)
export const DEFAULT_EMPRESA: InfoEmpresa = {
  nombre: "LEMCORP",
  ruc: "",
  direccion: "",
  telefono: "",
  correo: "",
  descripcion: "Empresa de telecomunicaciones dedicada a la instalación y mantenimiento de redes de fibra óptica y servicios de telecomunicaciones.",
};
