// Tipos del sistema de gestión de almacén Nuclon WMS
// Premium build — REBUILD-1

export type ActiveView =
  | "dashboard"
  | "inventario"
  | "despachos"
  | "equipos"
  | "series"
  | "pistolear"
  | "horario"
  | "bloc"
  | "ia"
  | "empresa"
  | "config";

// ─────────── Inventario ───────────
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

// ─────────── Equipos (trazabilidad por serie) ───────────
export type EstadoEquipo =
  | "disponible"
  | "averiado"
  | "en_retiro"
  | "en_reparacion";

export interface ESTADO_META_ENTRY {
  label: string;
  short: string;
  icon: "check" | "x" | "undo" | "wrench";
  tone: "ok" | "danger" | "warn" | "neutral";
}

export const ESTADO_META: Record<EstadoEquipo, ESTADO_META_ENTRY> = {
  disponible: { label: "Disponible", short: "Disponible", icon: "check", tone: "ok" },
  averiado: { label: "Averiado", short: "Averiado", icon: "x", tone: "danger" },
  en_retiro: { label: "En retiro", short: "Retiro", icon: "undo", tone: "warn" },
  en_reparacion: { label: "En reparación", short: "Reparación", icon: "wrench", tone: "neutral" },
};

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

// ─────────── Movimientos: Entradas y Despachos ───────────
export interface Entrada {
  id: string;
  fecha: number;
  sku: string;
  producto: string;
  cantidad: number;
  observacion?: string;
}

export interface Despacho {
  id: string;
  fecha: number;
  sku: string;
  producto: string;
  cantidad: number;
  tecnico?: string;
  destino?: string;
  observacion?: string;
}

// ─────────── Bloc ───────────
export interface Nota {
  id: string;
  texto: string;
  fecha: number;
  pinned: boolean;
}

// ─────────── Horario de almacén ───────────
export type TipoHorario = "despacho" | "almuerzo" | "reunion" | "otro";
export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export interface Horario {
  id: string;
  dia: DiaSemana;
  horaInicio: string; // "08:00"
  horaFin: string;    // "09:00"
  actividad: string;
  tipo: TipoHorario;
  // flag interno: si ya se disparó la notificación del día (se resetea a false cuando cambia el día)
  ultimoDisparo?: string; // ISO date (YYYY-MM-DD) del último disparo
}

export const DIA_SEMANA_META: Record<DiaSemana, { label: string; short: string }> = {
  lunes: { label: "Lunes", short: "Lun" },
  martes: { label: "Martes", short: "Mar" },
  miercoles: { label: "Miércoles", short: "Mié" },
  jueves: { label: "Jueves", short: "Jue" },
  viernes: { label: "Viernes", short: "Vie" },
  sabado: { label: "Sábado", short: "Sáb" },
  domingo: { label: "Domingo", short: "Dom" },
};

export const TIPO_HORARIO_META: Record<
  TipoHorario,
  { label: string; tone: "neutral" | "info" | "warn" | "ok"; dot: string }
> = {
  despacho: { label: "Despacho", tone: "neutral", dot: "bg-primary" },
  almuerzo: { label: "Almuerzo", tone: "warn", dot: "bg-amber-500" },
  reunion: { label: "Reunión", tone: "info", dot: "bg-cyan-600" },
  otro: { label: "Otro", tone: "ok", dot: "bg-emerald-500" },
};

// ─────────── Recordatorios (controlados por la IA) ───────────
export interface Recordatorio {
  id: string;
  texto: string;
  fecha: number;          // cuándo se creó
  cuando: number;         // cuándo debe dispararse (timestamp)
  disparado: boolean;     // ya se notificó?
  origen: "ia" | "manual";
}

// ─────────── Notificaciones estilo iPhone ───────────
export interface Notificacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: "recordatorio" | "stock" | "info" | "alerta" | "horario";
  fecha: number;
  leida: boolean;
}

// ─────────── Empresa y equipo de trabajo ───────────
export type Rol =
  | "jefe_operaciones"
  | "supervisor"
  | "tecnico"
  | "almacenero"
  | "administrador";

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

export interface InfoEmpresa {
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  descripcion?: string;
}

// ─────────── Tema ───────────
export type Tema = "claro" | "oscuro" | "sistema";

// ─────────── Settings ───────────
export interface Settings {
  lowStockAlerts: boolean;
  pistoleoPrefijoEnabled: boolean;
  pistoleoPrefijo: string;
  tema: Tema;
  usuario: string;
  voz: boolean; // TTS (text-to-speech) para Alana
}

export const DEFAULT_SETTINGS: Settings = {
  lowStockAlerts: true,
  pistoleoPrefijoEnabled: true,
  pistoleoPrefijo: "ZTEATV",
  tema: "oscuro",
  usuario: "Iker",
  voz: false,
};

export const DEFAULT_EMPRESA: InfoEmpresa = {
  nombre: "Lemcorp",
  ruc: "",
  direccion: "",
  telefono: "",
  correo: "",
  descripcion:
    "Nuclon — Almacén central\nPropietario: Lemcorp\nContratista: LPS (Claro)\nTécnicos en campo: 30\nDespacho diario: ~17 técnicos\nCobertura: Lima Norte, Comas, Los Olivos",
};

// ─────────── Helper ───────────
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─────────── Pistoleo ───────────
export type PistoleoCampo = "serie" | "serie_ua" | "serie_mac";

export interface PistoleoCampoMeta {
  value: PistoleoCampo;
  label: string;
  short: string;
  campos: string[];
  hint: string;
}

export const PISTOLEO_CAMPOS: Record<PistoleoCampo, PistoleoCampoMeta> = {
  serie: {
    value: "serie",
    label: "Solo serie",
    short: "Serie",
    campos: ["Serie"],
    hint: "Una sola lectura por equipo",
  },
  serie_ua: {
    value: "serie_ua",
    label: "Serie + UA",
    short: "Serie + UA",
    campos: ["Serie", "UA"],
    hint: "Dos lecturas: primero serie, luego UA",
  },
  serie_mac: {
    value: "serie_mac",
    label: "Serie + MAC",
    short: "Serie + MAC",
    campos: ["Serie", "MAC"],
    hint: "Dos lecturas: primero serie, luego MAC",
  },
};

export interface FilaPistoleo {
  id: string;
  valores: string[];
  timestamp: number;
}

// ─────────── Reglas de prefijo → modelo ───────────
export interface ReglaPrefijo {
  prefijo: string;
  modelo: string;
  marca?: string;
}

export const REGLAS_PREFIJO: ReglaPrefijo[] = [
  {
    prefijo: "ZTEATV",
    modelo: "DECODIFICADOR IPTV ZXVAB B866V2-H ZTE",
    marca: "ZTE",
  },
  {
    prefijo: "4857544",
    modelo: "ROUTER ONT HG8145X6-13 HUAWEI",
    marca: "HUAWEI",
  },
];
