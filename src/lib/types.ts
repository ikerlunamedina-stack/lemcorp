// Tipos del sistema de gestión de almacén LEMCORP WMS
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
  | "notificaciones"
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
  /** MAC del equipo (si aplica) */
  mac?: string;
  /** CM MAC (Cable Modem MAC, si aplica) */
  cmMac?: string;
  /** MTA MAC (si aplica, para equipos de voz) */
  mtaMac?: string;
  /** UA (Unidad de Acceso, si aplica) */
  ua?: string;
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
  | "almacenero"
  | "administrador";

export const ROL_META: Record<Rol, { label: string; short: string }> = {
  jefe_operaciones: { label: "Jefe de Operaciones", short: "Jefe Op." },
  supervisor: { label: "Supervisor", short: "Supervisor" },
  almacenero: { label: "Almacenero", short: "Almacenero" },
  administrador: { label: "Administrador del Sistema", short: "Admin" },
};

// ─────────── Permisos del sistema ───────────
export type Permiso =
  | "ver_dashboard"
  | "ver_inventario"
  | "editar_inventario"
  | "ver_despachos"
  | "editar_despachos"
  | "ver_equipos"
  | "editar_equipos"
  | "pistolear"
  | "ver_horario"
  | "editar_horario"
  | "usar_ia"
  | "ver_bloc"
  | "editar_bloc"
  | "ver_empresa"
  | "editar_empresa"
  | "ver_notificaciones"
  | "ver_config"
  | "editar_config"
  | "gestionar_personal"
  | "gestionar_permisos";

export const PERMISO_META: Record<Permiso, { label: string; desc: string }> = {
  ver_dashboard: { label: "Ver Dashboard", desc: "Acceso al panel principal" },
  ver_inventario: { label: "Ver Inventario", desc: "Consultar productos" },
  editar_inventario: { label: "Editar Inventario", desc: "Añadir/modificar/eliminar productos" },
  ver_despachos: { label: "Ver Despachos", desc: "Consultar despachos" },
  editar_despachos: { label: "Editar Despachos", desc: "Registrar/modificar despachos" },
  ver_equipos: { label: "Ver Equipos", desc: "Consultar equipos por serie" },
  editar_equipos: { label: "Editar Equipos", desc: "Añadir/modificar equipos" },
  pistolear: { label: "Pistolear", desc: "Capturar series" },
  ver_horario: { label: "Ver Horario", desc: "Consultar horario del almacén" },
  editar_horario: { label: "Editar Horario", desc: "Añadir/modificar actividades" },
  usar_ia: { label: "Usar Alana (IA)", desc: "Conversar con el asistente" },
  ver_bloc: { label: "Ver Bloc", desc: "Consultar notas" },
  editar_bloc: { label: "Editar Bloc", desc: "Crear/modificar notas" },
  ver_empresa: { label: "Ver Empresa", desc: "Consultar datos de la empresa" },
  editar_empresa: { label: "Editar Empresa", desc: "Modificar datos de la empresa" },
  ver_notificaciones: { label: "Ver Avisos", desc: "Consultar notificaciones" },
  ver_config: { label: "Ver Configuración", desc: "Ver ajustes del sistema" },
  editar_config: { label: "Editar Configuración", desc: "Modificar ajustes del sistema" },
  gestionar_personal: { label: "Gestionar Personal", desc: "Añadir/editar/eliminar miembros del equipo" },
  gestionar_permisos: { label: "Gestionar Permisos", desc: "Otorgar o quitar permisos a otros" },
};

// Permisos por defecto según el rol
export const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  administrador: [
    "ver_dashboard", "ver_inventario", "editar_inventario",
    "ver_despachos", "editar_despachos",
    "ver_equipos", "editar_equipos", "pistolear",
    "ver_horario", "editar_horario",
    "usar_ia",
    "ver_bloc", "editar_bloc",
    "ver_empresa", "editar_empresa",
    "ver_notificaciones",
    "ver_config", "editar_config",
    "gestionar_personal", "gestionar_permisos",
  ],
  jefe_operaciones: [
    "ver_dashboard", "ver_inventario", "editar_inventario",
    "ver_despachos", "editar_despachos",
    "ver_equipos", "editar_equipos", "pistolear",
    "ver_horario", "editar_horario",
    "usar_ia",
    "ver_bloc", "editar_bloc",
    "ver_empresa", "editar_empresa",
    "ver_notificaciones",
    "ver_config",
    "gestionar_personal",
  ],
  supervisor: [
    "ver_dashboard", "ver_inventario",
    "ver_despachos", "editar_despachos",
    "ver_equipos", "editar_equipos", "pistolear",
    "ver_horario",
    "usar_ia",
    "ver_bloc",
    "ver_empresa",
    "ver_notificaciones",
  ],
  almacenero: [
    "ver_dashboard",
    "ver_inventario", "editar_inventario",
    "ver_despachos",
    "ver_equipos", "editar_equipos", "pistolear",
    "ver_horario",
    "ver_bloc",
    "ver_notificaciones",
  ],
};

export interface MiembroEquipo {
  id: string;
  nombre: string;
  rol: Rol;
  correo?: string;
  telefono?: string;
  activo: boolean;
  /** Permisos personalizados (override sobre el rol). Si está vacío, se usan los del rol. */
  permisosExtra?: Permiso[];
  /** Permisos del rol que se le revocaron. */
  permisosRevocados?: Permiso[];
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
  vozURI: string; // Nombre interno de la voz seleccionada (vacío = automático)
}

export const DEFAULT_SETTINGS: Settings = {
  lowStockAlerts: true,
  pistoleoPrefijoEnabled: true,
  pistoleoPrefijo: "ZTEATV",
  tema: "claro",
  usuario: "Iker",
  voz: false,
  vozURI: "",
};

export const DEFAULT_EMPRESA: InfoEmpresa = {
  nombre: "Lemcorp",
  ruc: "",
  direccion: "",
  telefono: "",
  correo: "",
  descripcion:
    "LEMCORP — Almacén central\nPropietario: Lemcorp\nContratista: LPS (Claro)\nPersonal en campo: 30\nDespacho diario: ~17 despachos\nCobertura: Lima Norte, Comas, Los Olivos",
};

// ─────────── Helper ───────────
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─────────── Pistoleo ───────────
// Campos disponibles para pistolear (marcables, no secuencia fija)
export type CampoPistoleo = "serie" | "mac" | "cmMac" | "mtaMac" | "ua";

export const CAMPOS_PISTOLEO_META: Record<CampoPistoleo, { label: string; short: string; placeholder: string }> = {
  serie: { label: "Serie", short: "Serie", placeholder: "Escanear serie…" },
  mac: { label: "MAC", short: "MAC", placeholder: "Escanear MAC…" },
  cmMac: { label: "CM MAC", short: "CM MAC", placeholder: "Escanear CM MAC…" },
  mtaMac: { label: "MTA MAC", short: "MTA MAC", placeholder: "Escanear MTA MAC…" },
  ua: { label: "UA", short: "UA", placeholder: "Escanear UA…" },
};

// Orden de los campos cuando se pistolean (el orden en que se escanean)
export const ORDEN_CAMPOS: CampoPistoleo[] = ["serie", "mac", "cmMac", "mtaMac", "ua"];

// Tipo legacy para compatibilidad con el store (ahora se deriva de los campos marcados)
export type PistoleoCampo = "serie" | "serie_ua" | "serie_mac" | "serie_mac_cm" | "serie_mac_mta" | "serie_mac_cm_mta";

export interface PistoleoCampoMeta {
  value: PistoleoCampo;
  label: string;
  short: string;
  campos: string[];
  hint: string;
}

export const PISTOLEO_CAMPOS: Record<PistoleoCampo, PistoleoCampoMeta> = {
  serie: { value: "serie", label: "Solo serie", short: "Serie", campos: ["Serie"], hint: "Una sola lectura por equipo" },
  serie_ua: { value: "serie_ua", label: "Serie + UA", short: "Serie + UA", campos: ["Serie", "UA"], hint: "Dos lecturas" },
  serie_mac: { value: "serie_mac", label: "Serie + MAC", short: "Serie + MAC", campos: ["Serie", "MAC"], hint: "Dos lecturas" },
  serie_mac_cm: { value: "serie_mac_cm", label: "Serie + MAC + CM MAC", short: "Serie + MAC + CM MAC", campos: ["Serie", "MAC", "CM MAC"], hint: "Tres lecturas" },
  serie_mac_mta: { value: "serie_mac_mta", label: "Serie + MAC + MTA MAC", short: "Serie + MAC + MTA MAC", campos: ["Serie", "MAC", "MTA MAC"], hint: "Tres lecturas" },
  serie_mac_cm_mta: { value: "serie_mac_cm_mta", label: "Serie + MAC + CM MAC + MTA MAC", short: "Serie + MAC + CM + MTA", campos: ["Serie", "MAC", "CM MAC", "MTA MAC"], hint: "Cuatro lecturas" },
};

export interface FilaPistoleo {
  id: string;
  valores: string[];
  timestamp: number;
  /** Modelo/equipo del inventario seleccionado para esta fila (si aplica) */
  modeloSeleccionado?: string;
  /** Campos que se pistolearon en esta fila (para mapear valores correctamente)
   *  Guarda el orden exacto en que se escanearon los campos.
   *  Ej: ["serie", "cmMac", "mtaMac"] si se pistoleó Serie + CM MAC + MTA MAC
   */
  camposMarcados?: string[];
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
