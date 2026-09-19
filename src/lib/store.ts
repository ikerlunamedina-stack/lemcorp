// Store global VRS WMS — Zustand + persist (localStorage)
// Premium build — REBUILD-1

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveView,
  AuditEntry,
  Despacho,
  Equipment,
  Entrada,
  EstadoEquipo,
  FilaPistoleo,
  Horario,
  InfoEmpresa,
  MiembroEquipo,
  Nota,
  Notificacion,
  Permiso,
  PistoleoCampo,
  Product,
  Recordatorio,
  Rol,
  Settings,
  TipoRecepcion,
} from "./types";
import {
  DEFAULT_EMPRESA,
  DEFAULT_SETTINGS,
  PERMISOS_POR_ROL,
  REGLAS_PREFIJO,
  uid,
} from "./types";

interface StoreState {
  // Datos
  products: Product[];
  equipos: Equipment[];
  entradas: Entrada[];
  despachos: Despacho[];
  notas: Nota[];
  recordatorios: Recordatorio[];
  notificaciones: Notificacion[];
  miembros: MiembroEquipo[];
  empresa: InfoEmpresa;
  settings: Settings;
  // ─── Auditoría: log de todas las acciones destructivas ───
  auditLog: AuditEntry[];

  // Horario de almacén
  horario: Horario[];

  // Memoria de aprendizaje de Alana (cosas que ha aprendido del usuario)
  memoriaIA: string[];

  // Cuenta de productos en bajo stock que el usuario ya vio
  // (para que el badge de la campana desaparezca al visitar /notificaciones)
  bajoStockVisto: number;

  // Sesión: ID del miembro del equipo que está usando el sistema ahora.
  // Si es null, se asume modo ADMIN (dueño del sistema) para compatibilidad.
  sesionUsuarioId: string | null;

  // UI / sesión
  activeView: ActiveView;

  // Pistoleo
  pistoleoCampo: PistoleoCampo;
  pistoleoModelo: string;
  pistoleoEstado: EstadoEquipo;
  /** Ubicación física donde se guardará el equipo pistoleado (Almacén, Taller, Cuarto Técnico, etc.) */
  pistoleoUbicacion: string;
  pistoleoFilas: FilaPistoleo[];
  /** Equipo del inventario seleccionado para aplicar a nuevas capturas */
  pistoleoModeloSeleccionado: string;
  /** Campos marcados para pistolear (checkboxes): serie, mac, cmMac, mtaMac, ua */
  pistoleoCamposMarcados: string[];

  // ─── Acciones: navegación ───
  setActiveView: (v: ActiveView) => void;

  // ─── Acciones: auditoría ───
  addAuditLog: (entry: { accion: AuditEntry["accion"]; entidad: string; entidadId?: string; descripcion: string; detalles?: string; }) => void;
  clearAuditLog: () => void;

  // ─── Acciones: notificaciones ───
  marcarBajoStockVisto: (count: number) => void;

  // ─── Acciones: pistoleo ───
  setPistoleoConfig: (patch: Partial<{
    pistoleoCampo: PistoleoCampo;
    pistoleoModelo: string;
    pistoleoEstado: EstadoEquipo;
    pistoleoUbicacion: string;
    pistoleoModeloSeleccionado: string;
    pistoleoCamposMarcados: string[];
  }>) => void;
  addPistoleoFila: (valores: string[], modeloSeleccionado?: string, camposMarcados?: string[]) => void;
  updatePistoleoFila: (id: string, valores: string[], modeloSeleccionado?: string) => void;
  deletePistoleoFila: (id: string) => void;
  clearPistoleoFilas: () => void;
  confirmarPistoleo: () => { ok: boolean; msg: string; count: number; duplicados?: string[] };

  // ─── Acciones: inventario ───
  addProduct: (sku: string, name: string, quantity: number, minStock?: number, udm?: string, precio?: number, categoria?: string) => string | null;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  findProductBySku: (sku: string) => Product | null;
  importProductsBulk: (items: { sku: string; name: string; quantity: number; minStock?: number; udm?: string }[]) => { ok: number; dup: number };

  // ─── Acciones: entradas ───
  registrarEntrada: (input: string) => { ok: boolean; msg: string; count: number };
  deleteEntrada: (id: string) => void;

  // ─── Acciones: recepciones (ingreso al inventario con guía SUNAT o manual) ───
  registrarRecepcion: (input: {
    tipo: TipoRecepcion;
    nGuia?: string;
    fechaTraslado?: string;
    rucRemitente?: string;
    nombreRemitente?: string;
    rucDestinatario?: string;
    nombreDestinatario?: string;
    puntoPartida?: string;
    puntoLlegada?: string;
    motivoTraslado?: string;
    empresa?: string;
    empresaRuc?: string;
    albaran?: string;
    observaciones?: string;
    items: Array<{
      sku: string;
      producto: string;
      unidad?: string;
      cantidad: number;
      series?: string[];
      requiereSerie?: boolean;
    }>;
  }) => {
    ok: number;
    fail: number;
    fails: string[];
    totalUnidades: number;
    totalSeries: number;
    entradasCreadas: number;
    productosCreados: number;
    productosActualizados: number;
    equiposRegistrados: number;
    recepcionId: string;
  };
  deleteRecepcion: (recepcionId: string) => void;

  // ─── Acciones: importación masiva de stock con series ───
  importarStockMasivo: (input: {
    almacen?: string;
    ubicacion?: string;
    propiedad?: string;
    items: Array<{
      sku: string;
      producto: string;
      udm?: string;
      categoria?: string;
      serie?: string;
      cantidad: number; // para items a granel (sin serie)
      requiereSerie: boolean;
    }>;
  }) => {
    ok: number;
    fail: number;
    fails: string[];
    productosCreados: number;
    productosActualizados: number;
    equiposRegistrados: number;
    equiposDuplicados: number;
    recepcionId: string;
  };

  // ─── Acciones: despachos ───
  registrarDespacho: (input: {
    sku: string;
    cantidad: number;
    tecnico?: string;
    destino?: string;
    observacion?: string;
    fecha?: number;
  }) => { ok: boolean; msg: string };
  registrarDespachosBulk: (despachos: Array<{
    sku: string;
    cantidad: number;
    tecnico?: string;
    destino?: string;
    observacion?: string;
    fecha?: number;
  }>) => { ok: number; fail: number; fails: string[]; totalUnidades: number };
  deleteDespacho: (id: string) => void;

  // ─── Acciones: transferencias (desde Excel de operaciones) ───
  registrarTransferencia: (input: {
    nOperacion: string;
    flujo?: "IN" | "OUT" | "INT";
    tipoOperacion?: string;
    almacenOrigen?: string;
    ubicacionOrigen?: string;
    almacenDestino?: string;
    ubicacionDestino?: string;
    razonSocialDestino?: string;
    rucDniDestino?: string;
    guiaRemision?: string;
    responsable?: string;
    tecnico?: string;
    fechaTraslado?: number | null;
    observaciones?: string;
    items: Array<{
      sku: string;
      producto: string;
      unidad?: string;
      cantidad: number;
      precioUnitario?: number;
      series?: string[];
      requiereSerie?: boolean;
    }>;
  }) => {
    ok: number;
    fail: number;
    fails: string[];
    totalUnidades: number;
    totalSeries: number;
    despachosCreados: number;
    productosActualizados: number;
    equiposMarcados: number;
  };
  deleteTransferencia: (nOperacion: string) => void;

  // ─── Acciones: equipos ───
  addEquipment: (e: Omit<Equipment, "id" | "createdAt" | "updatedAt">) => string | null;
  addEquipmentBulk: (input: {
    series: string[];
    modelo: string;
    estado: EstadoEquipo;
    ubicacion?: string;
    observacion?: string;
  }) => { ok: number; dup: number };
  updateEquipment: (id: string, data: Partial<Omit<Equipment, "id" | "createdAt">>) => void;
  deleteEquipment: (id: string) => void;
  findEquipmentBySerie: (serie: string) => Equipment | null;
  deleteEquipmentBulk: (ids: string[]) => void;

  // ─── Acciones: bloc ───
  addNota: (texto: string) => void;
  togglePinNota: (id: string) => void;
  deleteNota: (id: string) => void;

  // ─── Acciones: horario ───
  addHorarioItem: (item: Omit<Horario, "id">) => void;
  updateHorarioItem: (id: string, data: Partial<Omit<Horario, "id">>) => void;
  deleteHorarioItem: (id: string) => void;
  marcarHorarioDisparado: (id: string, fechaISO: string) => void;
  checkHorario: () => Horario[];

  // ─── Acciones: memoria IA ───
  addMemoria: (texto: string) => void;
  deleteMemoria: (index: number) => void;
  clearMemoria: () => void;

  // ─── Acciones: recordatorios (IA) ───
  addRecordatorio: (texto: string, cuando: number, origen?: "ia" | "manual") => string;
  deleteRecordatorio: (id: string) => void;
  marcarRecordatorioDisparado: (id: string) => void;
  checkRecordatorios: () => Recordatorio[];

  // ─── Acciones: notificaciones (estilo iPhone) ───
  addNotificacion: (titulo: string, cuerpo: string, tipo?: Notificacion["tipo"]) => string;
  markNotificacionLeida: (id: string) => void;
  clearNotificaciones: () => void;
  clearNotificacionesLeidas: () => void;

  // ─── Acciones: empresa / miembros ───
  updateEmpresa: (data: Partial<InfoEmpresa>) => void;
  addMiembro: (nombre: string, rol: Rol, correo?: string, telefono?: string) => void;
  updateMiembro: (id: string, data: Partial<Omit<MiembroEquipo, "id">>) => void;
  deleteMiembro: (id: string) => void;

  // ─── Acciones: sesión y permisos ───
  iniciarSesion: (miembroId: string) => void;
  cerrarSesion: () => void;
  tienePermiso: (permiso: Permiso) => boolean;
  setPermisosMiembro: (id: string, permisosExtra: Permiso[], permisosRevocados: Permiso[]) => void;

  // ─── Export ───
  exportInventarioExcel: () => void;
  exportarPistoleoExcel: () => void;

  // ─── Config ───
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  clearAllData: () => void;
  seedDemo: () => void;
}

function normalizaSerie(s: string): string {
  return s.trim();
}

function detectarModeloPorPrefijo(serie: string): string | null {
  const s = serie.trim().toUpperCase();
  if (!s) return null;
  for (const regla of REGLAS_PREFIJO) {
    if (s.startsWith(regla.prefijo.toUpperCase())) return regla.modelo;
  }
  return null;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      equipos: [],
      entradas: [],
      despachos: [],
      notas: [],
      recordatorios: [],
      notificaciones: [],
      miembros: [],
      empresa: { ...DEFAULT_EMPRESA },
      settings: { ...DEFAULT_SETTINGS },
      auditLog: [],

      horario: [],
      memoriaIA: [],

      bajoStockVisto: 0,

      sesionUsuarioId: null,

      activeView: "dashboard",

      // pistoleo
      pistoleoCampo: "serie",
      pistoleoModelo: "",
      pistoleoEstado: "disponible",
      pistoleoUbicacion: "",
      pistoleoFilas: [],
      pistoleoModeloSeleccionado: "",
      pistoleoCamposMarcados: ["serie"],

      // ─── Navegación ───
      setActiveView: (v) => set({ activeView: v }),

      // ─── Auditoría ───
      addAuditLog: ({ accion, entidad, entidadId, descripcion, detalles }) => {
        const entry: AuditEntry = {
          id: uid(),
          fecha: Date.now(),
          accion,
          entidad,
          entidadId,
          descripcion,
          detalles,
          usuario: (() => {
            const sid = get().sesionUsuarioId;
            if (!sid) return undefined;
            const m = get().miembros.find((x) => x.id === sid);
            return m?.nombre;
          })(),
        };
        // Mantener solo los últimos 500 registros (evita inchar el localStorage)
        const log = [entry, ...get().auditLog].slice(0, 500);
        set({ auditLog: log });
      },

      clearAuditLog: () => set({ auditLog: [] }),

      // ─── Notificaciones ───
      marcarBajoStockVisto: (count) => set({ bajoStockVisto: count }),

      // ─── Sesión y permisos ───
      iniciarSesion: (miembroId) => set({ sesionUsuarioId: miembroId }),
      cerrarSesion: () => set({ sesionUsuarioId: null }),
      tienePermiso: (permiso) => {
        const state = get();
        const userId = state.sesionUsuarioId;
        // Si no hay sesión iniciada, modo ADMIN (dueño) — todos los permisos
        if (!userId) return true;
        const miembro = state.miembros.find((m) => m.id === userId);
        if (!miembro) return true; // fallback admin
        // Admin tiene todo
        if (miembro.rol === "administrador") return true;
        // Permisos del rol
        const permisosRol = PERMISOS_POR_ROL[miembro.rol] ?? [];
        const extra = miembro.permisosExtra ?? [];
        const revocados = miembro.permisosRevocados ?? [];
        const efectivos = new Set([...permisosRol, ...extra]);
        for (const r of revocados) efectivos.delete(r);
        return efectivos.has(permiso);
      },
      setPermisosMiembro: (id, permisosExtra, permisosRevocados) =>
        set({
          miembros: get().miembros.map((m) =>
            m.id === id ? { ...m, permisosExtra, permisosRevocados } : m
          ),
        }),

      // ─── Pistoleo ───
      setPistoleoConfig: (patch) => set({ ...patch }),
      addPistoleoFila: (valores, modeloSeleccionado, camposMarcados) => {
        const current = get().pistoleoFilas;
        // Límite duro de 1000 series por lote (rendimiento + cuota localStorage)
        if (current.length >= 1000) {
          return;
        }
        set({
          pistoleoFilas: [
            {
              id: uid(),
              valores: valores.map((v) => v.trim()),
              timestamp: Date.now(),
              modeloSeleccionado,
              camposMarcados: camposMarcados ?? get().pistoleoCamposMarcados,
            },
            ...current,
          ],
        });
      },
      updatePistoleoFila: (id, valores, modeloSeleccionado) =>
        set({
          pistoleoFilas: get().pistoleoFilas.map((f) =>
            f.id === id
              ? {
                  ...f,
                  valores: valores.map((v) => v.trim()),
                  modeloSeleccionado: modeloSeleccionado ?? f.modeloSeleccionado,
                }
              : f
          ),
        }),
      deletePistoleoFila: (id) =>
        set({ pistoleoFilas: get().pistoleoFilas.filter((f) => f.id !== id) }),
      clearPistoleoFilas: () => set({ pistoleoFilas: [] }),

      confirmarPistoleo: () => {
        const filas = get().pistoleoFilas;
        if (filas.length === 0) return { ok: false, msg: "No hay series para guardar.", count: 0 };
        const { pistoleoModelo, pistoleoEstado, pistoleoUbicacion } = get();
        const camposMarcadosGlobal = get().pistoleoCamposMarcados || ["serie"];
        let count = 0;
        const nuevos: Equipment[] = [];
        const existentes = new Set(get().equipos.map((e) => e.serie.trim().toLowerCase()));
        const duplicadosNoGuardados: string[] = [];
        const fechasNow = Date.now();
        const ORDEN = ["serie", "cmMac", "mtaMac", "ua"];
        for (const f of filas) {
          // Usar los campos marcados de la fila (cada fila puede tener campos distintos)
          const camposFila = (f.camposMarcados && f.camposMarcados.length > 0)
            ? f.camposMarcados
            : camposMarcadosGlobal;
          const camposOrden = ORDEN.filter((c) => camposFila.includes(c));
          const idx = (campo: string) => camposOrden.indexOf(campo);

          // La serie SIEMPRE va en valores[0] (es el primer campo escaneado)
          const serie = (f.valores[0] ?? "").trim();
          if (!serie) continue;
          if (existentes.has(serie.toLowerCase())) {
            duplicadosNoGuardados.push(serie);
            continue;
          }

          // Mapear cada campo a su valor según el orden de la fila
          const conCM = camposFila.includes("cmMac");
          const conMTA = camposFila.includes("mtaMac");
          const conUA = camposFila.includes("ua");
          const cmMac = conCM ? (f.valores[idx("cmMac")] ?? "").trim() || undefined : undefined;
          const mtaMac = conMTA ? (f.valores[idx("mtaMac")] ?? "").trim() || undefined : undefined;
          const ua = conUA ? (f.valores[idx("ua")] ?? "").trim() || undefined : undefined;
          const modelo = f.modeloSeleccionado?.trim()
            || pistoleoModelo.trim()
            || detectarModeloPorPrefijo(serie)
            || "SIN MODELO";
          nuevos.push({
            id: uid(),
            serie,
            modelo,
            estado: pistoleoEstado,
            ubicacion: pistoleoUbicacion || "Almacén",
            cmMac,
            mtaMac,
            ua,
            createdAt: fechasNow,
            updatedAt: fechasNow,
          });
          existentes.add(serie.toLowerCase());
          count++;
        }
        if (count === 0) {
          return {
            ok: false,
            msg: `Las ${duplicadosNoGuardados.length} serie(s) ya estaban registradas en el sistema.`,
            count: 0,
            duplicados: duplicadosNoGuardados,
          };
        }
        // Guardar en equipos pero NO borrar pistoleoFilas — el usuario decide cuándo limpiar
        // (puede exportar a Excel después de guardar, o seguir añadiendo)
        set({ equipos: [...nuevos, ...get().equipos] });
        return {
          ok: true,
          msg: duplicadosNoGuardados.length > 0
            ? `${count} equipo(s) guardado(s). ${duplicadosNoGuardados.length} ya estaban registradas.`
            : `${count} equipo(s) guardado(s) correctamente.`,
          count,
          duplicados: duplicadosNoGuardados.length > 0 ? duplicadosNoGuardados : undefined,
        };
      },

      // ─── Inventario ───
      findProductBySku: (sku) => {
        const norm = sku.trim().toLowerCase();
        return get().products.find((p) => p.sku.trim().toLowerCase() === norm) ?? null;
      },

      addProduct: (sku, name, quantity, minStock, udm, precio, categoria) => {
        const skuTrim = sku.trim();
        if (!skuTrim || !name.trim()) return null;
        if (get().findProductBySku(skuTrim)) return null;
        const p: Product = {
          id: uid(),
          sku: skuTrim,
          name: name.trim(),
          quantity: quantity || 0,
          minStock,
          udm,
          precio: precio || undefined,
          categoria: categoria?.trim() || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ products: [...get().products, p] });
        return p.id;
      },

      updateProduct: (id, data) =>
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
          ),
        }),

      deleteProduct: (id) => {
        const p = get().products.find((x) => x.id === id);
        if (!p) return;
        get().addAuditLog({
          accion: "delete_product",
          entidad: "producto",
          entidadId: id,
          descripcion: `Producto "${p.name}" (SKU ${p.sku}) — stock ${p.quantity} ${p.udm || ""}`,
          detalles: JSON.stringify({ sku: p.sku, name: p.name, quantity: p.quantity, udm: p.udm, precio: p.precio, categoria: p.categoria }),
        });
        set({ products: get().products.filter((x) => x.id !== id) });
      },

      importProductsBulk: (items) => {
        let ok = 0;
        let dup = 0;
        const nuevos: Product[] = [];
        const existSkus = new Set(get().products.map((p) => p.sku.trim().toLowerCase()));
        for (const it of items) {
          const sku = it.sku.trim();
          if (!sku || !it.name.trim()) continue;
          if (existSkus.has(sku.toLowerCase())) { dup++; continue; }
          existSkus.add(sku.toLowerCase());
          nuevos.push({
            id: uid(),
            sku,
            name: it.name.trim(),
            quantity: it.quantity || 0,
            minStock: it.minStock,
            udm: it.udm,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          ok++;
        }
        if (nuevos.length > 0) set({ products: [...get().products, ...nuevos] });
        return { ok, dup };
      },

      // ─── Entradas (formato SKU*cantidad por línea) ───
      registrarEntrada: (input) => {
        const lines = input.split("\n").filter((l) => l.trim());
        let count = 0;
        const newEntradas: Entrada[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          // Separar por * o por tab, o solo SKU (cantidad = 1)
          let parts: string[];
          if (trimmed.includes("*")) {
            parts = trimmed.split("*");
          } else if (trimmed.includes("\t")) {
            parts = trimmed.split("\t");
          } else {
            parts = [trimmed, "1"];
          }
          const sku = parts[0].trim();
          const cantidad = parseInt((parts[1] ?? "1").trim(), 10);
          if (!sku || isNaN(cantidad) || cantidad <= 0) continue;
          const product = get().findProductBySku(sku);
          if (product) {
            set({
              products: get().products.map((p) =>
                p.id === product.id
                  ? { ...p, quantity: p.quantity + cantidad, updatedAt: Date.now() }
                  : p
              ),
            });
          }
          newEntradas.push({
            id: uid(),
            fecha: Date.now(),
            sku,
            producto: product?.name ?? sku,
            cantidad,
          });
          count++;
        }
        if (count > 0) set({ entradas: [...newEntradas, ...get().entradas] });
        return {
          ok: count > 0,
          msg: count > 0
            ? `${count} entrada(s) registrada(s)`
            : "Formato incorrecto. Usa: SKU*cantidad (ej: 1066990*100)",
          count,
        };
      },

      deleteEntrada: (id) => {
        const ent = get().entradas.find((e) => e.id === id);
        if (!ent) return;
        const product = get().findProductBySku(ent.sku);
        if (product) {
          set({
            products: get().products.map((p) =>
              p.id === product.id
                ? { ...p, quantity: Math.max(0, p.quantity - ent.cantidad), updatedAt: Date.now() }
                : p
            ),
          });
        }
        // Eliminar series asociadas si las tenía
        if (ent.series && ent.series.length > 0) {
          set({
            equipos: get().equipos.filter((e) =>
              !ent.series!.some((s) => s.toLowerCase() === e.serie.trim().toLowerCase())
            ),
          });
        }
        get().addAuditLog({
          accion: "delete_entrada",
          entidad: "entrada",
          entidadId: id,
          descripcion: `Entrada de ${ent.cantidad} × ${ent.producto || ent.sku}${ent.nGuia ? ` (guía ${ent.nGuia})` : ""}${ent.series && ent.series.length > 0 ? ` — ${ent.series.length} serie(s)` : ""}`,
          detalles: JSON.stringify({ sku: ent.sku, cantidad: ent.cantidad, nGuia: ent.nGuia, series: ent.series }),
        });
        set({ entradas: get().entradas.filter((e) => e.id !== id) });
      },

      // ─── Recepciones (ingreso al inventario con guía SUNAT o manual) ───
      registrarRecepcion: (input) => {
        const recepcionId = uid();
        let ok = 0;
        let fail = 0;
        const fails: string[] = [];
        let totalUnidades = 0;
        let totalSeries = 0;
        let entradasCreadas = 0;
        let productosCreados = 0;
        let productosActualizados = 0;
        let equiposRegistrados = 0;
        const nuevasEntradas: Entrada[] = [];
        const productosActualizadosMap = new Map<string, number>(); // productId -> newQty
        const ts = Date.now();

        for (const item of input.items) {
          const skuTrim = item.sku.trim();
          const prodTrim = item.producto.trim();
          if (!skuTrim && !prodTrim) {
            fail++;
            fails.push("Item sin SKU ni producto");
            continue;
          }
          if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
            fail++;
            fails.push(`Cantidad inválida para ${skuTrim || prodTrim}`);
            continue;
          }

          const series = (item.series ?? []).map((s) => s.trim()).filter(Boolean);
          // Validación de series requeridas
          if (item.requiereSerie) {
            if (series.length < item.cantidad) {
              fail++;
              fails.push(`${skuTrim || prodTrim}: faltan ${item.cantidad - series.length} serie(s)`);
              continue;
            }
            if (series.length > item.cantidad) {
              fail++;
              fails.push(`${skuTrim || prodTrim}: sobran ${series.length - item.cantidad} serie(s)`);
              continue;
            }
          }

          // Buscar producto en catálogo por SKU.
          // IMPORTANTE: NO se crea automáticamente — el SKU debe existir
          // previamente en el catálogo. Si no existe, el item falla con
          // un error claro y NO se ingresa al inventario.
          const product = skuTrim ? get().findProductBySku(skuTrim) : null;
          if (!product && skuTrim) {
            fail++;
            fails.push(`${skuTrim} (${prodTrim}): SKU no existe en el catálogo. Créalo primero en /inventario o usa /recepciones solo para SKUs ya registrados.`);
            continue;
          }

          // Para items CON serie → registrar equipos disponibles (sumar a stock de equipos)
          if (item.requiereSerie && series.length > 0) {
            const r = get().addEquipmentBulk({
              series,
              modelo: prodTrim,
              estado: "disponible",
              ubicacion: input.puntoLlegada || input.empresa,
              observacion: `Ingreso por recepción ${recepcionId}${input.nGuia ? ` (guía ${input.nGuia})` : ""}`,
            });
            equiposRegistrados += r.ok;
            totalSeries += r.ok;
          } else if (product) {
            // Item a granel (sin serie) — sumar quantity al inventario
            const stockActual = productosActualizadosMap.get(product.id) ?? product.quantity;
            productosActualizadosMap.set(product.id, stockActual + item.cantidad);
            productosActualizados++;
          }

          // Crear entrada en el historial
          nuevasEntradas.push({
            id: uid(),
            fecha: ts,
            sku: skuTrim || prodTrim,
            producto: prodTrim || skuTrim,
            cantidad: item.cantidad,
            unidad: item.unidad,
            observacion: input.observaciones,
            tipoRecepcion: input.tipo,
            nGuia: input.nGuia,
            fechaTraslado: input.fechaTraslado,
            rucRemitente: input.rucRemitente,
            nombreRemitente: input.nombreRemitente,
            rucDestinatario: input.rucDestinatario,
            nombreDestinatario: input.nombreDestinatario,
            puntoPartida: input.puntoPartida,
            puntoLlegada: input.puntoLlegada,
            motivoTraslado: input.motivoTraslado,
            empresa: input.empresa,
            empresaRuc: input.empresaRuc,
            albaran: input.albaran,
            series: series.length > 0 ? series : undefined,
            recepcionId,
          });
          entradasCreadas++;
          ok++;
          totalUnidades += item.cantidad;
        }

        if (nuevasEntradas.length > 0 || productosActualizadosMap.size > 0) {
          // Aplicar actualizaciones de productos a granel
          const productsUpdated = productosActualizadosMap.size > 0
            ? get().products.map((p) => {
                const newQty = productosActualizadosMap.get(p.id);
                return newQty !== undefined ? { ...p, quantity: newQty, updatedAt: ts } : p;
              })
            : get().products;
          set({
            entradas: [...nuevasEntradas, ...get().entradas],
            products: productsUpdated,
          });
        }

        return {
          ok,
          fail,
          fails,
          totalUnidades,
          totalSeries,
          entradasCreadas,
          productosCreados,
          productosActualizados,
          equiposRegistrados,
          recepcionId,
        };
      },

      deleteRecepcion: (recepcionId) => {
        const ents = get().entradas.filter((e) => e.recepcionId === recepcionId);
        if (ents.length === 0) return;

        // Restaurar stock: para items a granel, descontar quantity
        // Para items con serie, eliminar los equipos creados por esta recepción
        const productosMap = new Map<string, number>();
        const seriesAEliminar: string[] = [];
        let totalUnidades = 0;
        let totalSeries = 0;
        for (const e of ents) {
          totalUnidades += e.cantidad;
          if (e.series && e.series.length > 0) {
            seriesAEliminar.push(...e.series);
            totalSeries += e.series.length;
          } else {
            const p = get().findProductBySku(e.sku);
            if (p) {
              productosMap.set(p.id, (productosMap.get(p.id) ?? p.quantity) - e.cantidad);
            }
          }
        }

        const productsUpdated = productosMap.size > 0
          ? get().products.map((p) => {
              const newQty = productosMap.get(p.id);
              return newQty !== undefined ? { ...p, quantity: Math.max(0, newQty), updatedAt: Date.now() } : p;
            })
          : get().products;
        const equiposUpdated = seriesAEliminar.length > 0
          ? get().equipos.filter((e) =>
              !seriesAEliminar.some((s) => s.toLowerCase() === e.serie.trim().toLowerCase())
            )
          : get().equipos;

        // Log de auditoría
        const primera = ents[0];
        get().addAuditLog({
          accion: "delete_recepcion",
          entidad: "recepcion",
          entidadId: recepcionId,
          descripcion: `Recepción${primera?.nGuia ? ` ${primera.nGuia}` : ""}${primera?.empresa ? ` (${primera.empresa})` : ""} — ${ents.length} item(s), ${totalUnidades} unidades, ${totalSeries} series eliminadas`,
          detalles: JSON.stringify({
            recepcionId,
            nGuia: primera?.nGuia,
            empresa: primera?.empresa,
            items: ents.length,
            totalUnidades,
            totalSeries,
            seriesAEliminar: seriesAEliminar.slice(0, 50),
          }),
        });

        set({
          entradas: get().entradas.filter((e) => e.recepcionId !== recepcionId),
          products: productsUpdated,
          equipos: equiposUpdated,
        });
      },

      // ─── Importación masiva de stock con series (Excel SpaceCom "Stock Detalle") ───
      importarStockMasivo: (input) => {
        const recepcionId = uid();
        let ok = 0;
        let fail = 0;
        const fails: string[] = [];
        let productosCreados = 0;
        let productosActualizados = 0;
        let equiposRegistrados = 0;
        let equiposDuplicados = 0;

        // Mapa de productos: sku → { product, cantidadAcumulada }
        const productosMap = new Map<string, { product: any; cantidad: number }>();
        // Series a registrar (agrupadas por modelo)
        const seriesPorModelo = new Map<string, { modelo: string; series: string[] }>();
        const nuevasEntradas: Entrada[] = [];
        const ts = Date.now();

        for (const item of input.items) {
          const skuTrim = item.sku.trim();
          const prodTrim = item.producto.trim();
          if (!skuTrim && !prodTrim) {
            fail++;
            fails.push("Item sin SKU ni producto");
            continue;
          }

          // Caso 1: Item CON serie → registrar equipo disponible
          if (item.serie && item.serie.trim()) {
            const serie = item.serie.trim();

            // Verificar si el equipo ya existe (duplicado)
            const existente = get().findEquipmentBySerie(serie);
            if (existente) {
              equiposDuplicados++;
              // No es error fatal — solo se ignora esa serie
              continue;
            }

            // Asegurar que el producto existe en catálogo
            let entry = productosMap.get(skuTrim || prodTrim);
            if (!entry) {
              let product = skuTrim ? get().findProductBySku(skuTrim) : null;
              if (!product) {
                // Crear producto con stock 0 (el stock real lo lleva cada equipo)
                const newId = get().addProduct(skuTrim, prodTrim, 0, undefined, item.udm);
                if (newId) {
                  product = get().findProductBySku(skuTrim);
                  if (product) productosCreados++;
                }
              }
              entry = { product, cantidad: 0 };
              productosMap.set(skuTrim || prodTrim, entry);
            }

            // Acumular serie para registro masivo
            const keyModel = skuTrim || prodTrim;
            if (!seriesPorModelo.has(keyModel)) {
              seriesPorModelo.set(keyModel, { modelo: prodTrim, series: [] });
            }
            seriesPorModelo.get(keyModel)!.series.push(serie);

            // Crear entrada individual en el historial
            nuevasEntradas.push({
              id: uid(),
              fecha: ts,
              sku: skuTrim || prodTrim,
              producto: prodTrim || skuTrim,
              cantidad: 1,
              unidad: item.udm,
              observacion: `Importación masiva de stock${input.almacen ? ` desde ${input.almacen}` : ""}`,
              tipoRecepcion: "regularizacion",
              empresa: input.almacen,
              empresaRuc: undefined,
              albaran: undefined,
              puntoLlegada: input.ubicacion,
              series: [serie],
              recepcionId,
            });

            ok++;
            continue;
          }

          // Caso 2: Item SIN serie (a granel) → sumar cantidad al stock del producto
          if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
            fail++;
            fails.push(`${skuTrim || prodTrim}: cantidad inválida (${item.cantidad})`);
            continue;
          }

          // Asegurar que el producto existe en catálogo
          let entry = productosMap.get(skuTrim || prodTrim);
          if (!entry) {
            let product = skuTrim ? get().findProductBySku(skuTrim) : null;
            if (!product) {
              const newId = get().addProduct(skuTrim, prodTrim, 0, undefined, item.udm);
              if (newId) {
                product = get().findProductBySku(skuTrim);
                if (product) productosCreados++;
              }
            }
            entry = { product, cantidad: 0 };
            productosMap.set(skuTrim || prodTrim, entry);
          }
          entry.cantidad += item.cantidad;
          if (entry.product) productosActualizados++;

          // Crear entrada en el historial
          nuevasEntradas.push({
            id: uid(),
            fecha: ts,
            sku: skuTrim || prodTrim,
            producto: prodTrim || skuTrim,
            cantidad: item.cantidad,
            unidad: item.udm,
            observacion: `Importación masiva de stock${input.almacen ? ` desde ${input.almacen}` : ""}`,
            tipoRecepcion: "regularizacion",
            empresa: input.almacen,
            empresaRuc: undefined,
            albaran: undefined,
            puntoLlegada: input.ubicacion,
            series: undefined,
            recepcionId,
          });

          ok++;
        }

        // Registrar series en bulk
        for (const [, { modelo, series }] of seriesPorModelo) {
          const r = get().addEquipmentBulk({
            series,
            modelo,
            estado: "disponible",
            ubicacion: input.ubicacion,
            observacion: `Importación masiva de stock${input.almacen ? ` desde ${input.almacen}` : ""}`,
          });
          equiposRegistrados += r.ok;
          equiposDuplicados += r.dup;
        }

        // Aplicar actualizaciones de productos a granel
        const productosUpdated = get().products.map((p) => {
          // Buscar en el mapa
          for (const [, entry] of productosMap) {
            if (entry.product && entry.product.id === p.id && entry.cantidad > 0) {
              return { ...p, quantity: p.quantity + entry.cantidad, updatedAt: ts };
            }
          }
          return p;
        });

        if (nuevasEntradas.length > 0 || productosUpdated !== get().products) {
          set({
            entradas: [...nuevasEntradas, ...get().entradas],
            products: productosUpdated,
          });
        }

        return {
          ok,
          fail,
          fails,
          productosCreados,
          productosActualizados,
          equiposRegistrados,
          equiposDuplicados,
          recepcionId,
        };
      },

      // ─── Despachos (valida SKU y stock, descuenta inventario) ───
      registrarDespacho: ({ sku, cantidad, tecnico, destino, observacion, fecha }) => {
        const skuTrim = sku.trim();
        const product = get().findProductBySku(skuTrim);
        if (!product) {
          return { ok: false, msg: `SKU "${skuTrim}" no encontrado en el catálogo.` };
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          return { ok: false, msg: "La cantidad debe ser mayor a 0." };
        }
        if (product.quantity < cantidad) {
          return {
            ok: false,
            msg: `Stock insuficiente. Disponible: ${product.quantity}, solicitado: ${cantidad}.`,
          };
        }
        const d: Despacho = {
          id: uid(),
          fecha: fecha || Date.now(),
          sku: product.sku,
          producto: product.name,
          cantidad,
          tecnico: tecnico?.trim() || undefined,
          destino: destino?.trim() || undefined,
          observacion: observacion?.trim() || undefined,
        };
        set({
          despachos: [d, ...get().despachos],
          products: get().products.map((p) =>
            p.id === product.id
              ? { ...p, quantity: p.quantity - cantidad, updatedAt: Date.now() }
              : p
          ),
        });
        return {
          ok: true,
          msg: `Despacho registrado: ${cantidad} × ${product.name} → stock: ${product.quantity - cantidad}`,
        };
      },

      // Registro masivo de despachos (para Excel importado)
      registrarDespachosBulk: (inputDespachos) => {
        let ok = 0;
        let fail = 0;
        let totalUnidades = 0;
        const fails: string[] = [];
        const nuevosDespachos: Despacho[] = [];
        const productosActualizados = new Map<string, number>();

        for (const item of inputDespachos) {
          const skuTrim = item.sku.trim();
          const product = get().findProductBySku(skuTrim);
          if (!product) {
            fail++;
            fails.push(`SKU "${skuTrim}" no encontrado`);
            continue;
          }
          if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
            fail++;
            fails.push(`Cantidad inválida para ${skuTrim}`);
            continue;
          }
          // Calcular stock disponible considerando despachos anteriores del mismo bulk
          const stockActual = productosActualizados.get(product.id) ?? product.quantity;
          if (stockActual < item.cantidad) {
            fail++;
            fails.push(`Stock insuficiente para ${product.name} (disp: ${stockActual}, solicitado: ${item.cantidad})`);
            continue;
          }
          productosActualizados.set(product.id, stockActual - item.cantidad);
          nuevosDespachos.push({
            id: uid(),
            fecha: item.fecha || Date.now(),
            sku: product.sku,
            producto: product.name,
            cantidad: item.cantidad,
            tecnico: item.tecnico?.trim() || undefined,
            destino: item.destino?.trim() || undefined,
            observacion: item.observacion?.trim() || undefined,
          });
          ok++;
          totalUnidades += item.cantidad;
        }

        if (nuevosDespachos.length > 0) {
          // Ordenar por fecha (más reciente primero)
          nuevosDespachos.sort((a, b) => b.fecha - a.fecha);
          set({
            despachos: [...nuevosDespachos, ...get().despachos],
            products: get().products.map((p) => {
              const newQty = productosActualizados.get(p.id);
              return newQty !== undefined ? { ...p, quantity: newQty, updatedAt: Date.now() } : p;
            }),
          });
        }
        return { ok, fail, fails, totalUnidades };
      },

      deleteDespacho: (id) => {
        const d = get().despachos.find((x) => x.id === id);
        if (!d) return;
        const product = get().findProductBySku(d.sku);
        if (product) {
          set({
            products: get().products.map((p) =>
              p.id === product.id
                ? { ...p, quantity: p.quantity + d.cantidad, updatedAt: Date.now() }
                : p
            ),
          });
        }
        // Reactivar equipos con serie si los tenía
        if (d.series && d.series.length > 0) {
          set({
            equipos: get().equipos.map((e) => {
              if (d.series!.some((s) => s.toLowerCase() === e.serie.trim().toLowerCase()) && e.estado === "en_retiro") {
                return { ...e, estado: "disponible" as EstadoEquipo, updatedAt: Date.now() };
              }
              return e;
            }),
          });
        }
        get().addAuditLog({
          accion: "delete_despacho",
          entidad: "despacho",
          entidadId: id,
          descripcion: `Despacho de ${d.cantidad} × ${d.producto || d.sku}${d.tecnico ? ` → ${d.tecnico}` : ""}${d.nOperacion ? ` (op ${d.nOperacion})` : ""}${d.series && d.series.length > 0 ? ` — ${d.series.length} serie(s)` : ""}`,
          detalles: JSON.stringify({ sku: d.sku, cantidad: d.cantidad, tecnico: d.tecnico, nOperacion: d.nOperacion, series: d.series }),
        });
        set({ despachos: get().despachos.filter((x) => x.id !== id) });
      },

      // ─── Transferencias (desde Excel de operaciones) ───
      registrarTransferencia: (input) => {
        let ok = 0;
        let fail = 0;
        const fails: string[] = [];
        let totalUnidades = 0;
        let totalSeries = 0;
        let despachosCreados = 0;
        let productosActualizados = 0;
        let equiposMarcados = 0;
        const nuevosDespachos: Despacho[] = [];
        const productosActualizadosMap = new Map<string, number>();
        const equiposAMarcar: string[] = [];

        const ts = Date.now();
        const fechaBase = input.fechaTraslado ?? ts;

        for (const item of input.items) {
          const skuTrim = item.sku.trim();
          const prodTrim = item.producto.trim();
          if (!skuTrim && !prodTrim) {
            fail++;
            fails.push("Item sin SKU ni producto");
            continue;
          }
          if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
            fail++;
            fails.push(`Cantidad inválida para ${skuTrim || prodTrim}`);
            continue;
          }

          const series = (item.series ?? []).map((s) => s.trim()).filter(Boolean);
          if (item.requiereSerie) {
            if (series.length < item.cantidad) {
              fail++;
              const faltan = item.cantidad - series.length;
              fails.push(`${skuTrim || prodTrim}: faltan ${faltan} serie(s) (requeridas ${item.cantidad}, hay ${series.length})`);
              continue;
            }
            if (series.length > item.cantidad) {
              fail++;
              fails.push(`${skuTrim || prodTrim}: sobran ${series.length - item.cantidad} serie(s) (requeridas ${item.cantidad})`);
              continue;
            }
          }

          const product = skuTrim ? get().findProductBySku(skuTrim) : null;

          // ─── Validación de series contra el inventario ───
          // Para items CON serie (routers, modems, decodificadores, etc.):
          //   - Cada serie TIENE que existir en el inventario de equipos
          //   - Si una serie no existe → FAIL con error claro
          //   - Si una serie existe pero ya está "en_retiro" o "averiada" → FAIL
          //   - Solo se permiten despachar equipos "disponibles"
          if (item.requiereSerie && series.length > 0) {
            const erroresSerie: string[] = [];
            const seriesValidas: string[] = [];
            for (const serie of series) {
              const eq = get().findEquipmentBySerie(serie);
              if (!eq) {
                erroresSerie.push(
                  `Serie "${serie}" NO está registrada en el inventario de equipos. ` +
                  `Ingresa este equipo primero con una recepción (PDF de guía SUNAT).`
                );
                continue;
              }
              if (eq.estado !== "disponible") {
                erroresSerie.push(
                  `Serie "${serie}" está "${eq.estado}" — no se puede despachar. ` +
                  `Solo se pueden despachar equipos disponibles.`
                );
                continue;
              }
              // Validar duplicados dentro del mismo bulk
              if (equiposAMarcar.includes(eq.id)) {
                erroresSerie.push(`Serie "${serie}" está duplicada en este despacho.`);
                continue;
              }
              seriesValidas.push(serie);
              equiposAMarcar.push(eq.id);
            }
            if (erroresSerie.length > 0) {
              fail++;
              fails.push(`${skuTrim || prodTrim}: ${erroresSerie.length} serie(s) con error:`);
              for (const e of erroresSerie) {
                fails.push(`  • ${e}`);
              }
              continue;
            }
            equiposMarcados += seriesValidas.length;
            totalSeries += seriesValidas.length;
          } else if (product) {
            const stockActual = productosActualizadosMap.get(product.id) ?? product.quantity;
            if (stockActual < item.cantidad) {
              fail++;
              fails.push(`${product.name}: stock insuficiente (disp: ${stockActual}, solicitado: ${item.cantidad})`);
              continue;
            }
            productosActualizadosMap.set(product.id, stockActual - item.cantidad);
            productosActualizados++;
          }

          nuevosDespachos.push({
            id: uid(),
            fecha: fechaBase,
            sku: skuTrim || prodTrim,
            producto: prodTrim || skuTrim,
            cantidad: item.cantidad,
            tecnico: input.tecnico?.trim() || input.razonSocialDestino?.trim() || undefined,
            destino: input.almacenDestino?.trim() || input.ubicacionDestino?.trim() || input.razonSocialDestino?.trim() || undefined,
            observacion: input.observaciones?.trim() || undefined,
            tipo: "transferencia",
            nOperacion: input.nOperacion,
            tipoOperacion: input.tipoOperacion,
            flujo: input.flujo,
            almacenOrigen: input.almacenOrigen,
            ubicacionOrigen: input.ubicacionOrigen,
            almacenDestino: input.almacenDestino,
            ubicacionDestino: input.ubicacionDestino,
            razonSocialDestino: input.razonSocialDestino,
            rucDniDestino: input.rucDniDestino,
            guiaRemision: input.guiaRemision,
            responsable: input.responsable,
            fechaTraslado: input.fechaTraslado ?? undefined,
            unidad: item.unidad,
            precioUnitario: item.precioUnitario,
            series: series.length > 0 ? series : undefined,
            requiereSerie: item.requiereSerie,
          });
          despachosCreados++;
          ok++;
          totalUnidades += item.cantidad;
        }

        if (nuevosDespachos.length > 0) {
          nuevosDespachos.sort((a, b) => b.fecha - a.fecha);
          const productsUpdated = productosActualizadosMap.size > 0
            ? get().products.map((p) => {
                const newQty = productosActualizadosMap.get(p.id);
                return newQty !== undefined ? { ...p, quantity: newQty, updatedAt: ts } : p;
              })
            : get().products;
          const equiposUpdated = equiposAMarcar.length > 0
            ? get().equipos.map((e) =>
                equiposAMarcar.includes(e.id)
                  ? { ...e, estado: "en_retiro" as EstadoEquipo, updatedAt: ts, ubicacion: input.almacenDestino || input.tecnico || e.ubicacion, observacion: `Salida por operación ${input.nOperacion}` }
                  : e
              )
            : get().equipos;

          set({
            despachos: [...nuevosDespachos, ...get().despachos],
            products: productsUpdated,
            equipos: equiposUpdated,
          });
        }

        return {
          ok,
          fail,
          fails,
          totalUnidades,
          totalSeries,
          despachosCreados,
          productosActualizados,
          equiposMarcados,
        };
      },

      deleteTransferencia: (nOperacion) => {
        const delets = get().despachos.filter((d) => d.nOperacion === nOperacion);
        if (delets.length === 0) return;

        const productosRestore = new Map<string, number>();
        const seriesRestore: string[] = [];
        let totalUnidades = 0;
        let totalSeries = 0;
        for (const d of delets) {
          totalUnidades += d.cantidad;
          if (d.series && d.series.length > 0) {
            seriesRestore.push(...d.series);
            totalSeries += d.series.length;
          } else if (d.sku) {
            const p = get().findProductBySku(d.sku);
            if (p) {
              productosRestore.set(p.id, (productosRestore.get(p.id) ?? p.quantity) + d.cantidad);
            }
          }
        }

        const productsUpdated = productosRestore.size > 0
          ? get().products.map((p) => {
              const newQty = productosRestore.get(p.id);
              return newQty !== undefined ? { ...p, quantity: newQty, updatedAt: Date.now() } : p;
            })
          : get().products;
        const equiposUpdated = seriesRestore.length > 0
          ? get().equipos.map((e) => {
              if (seriesRestore.some((s) => s.toLowerCase() === e.serie.trim().toLowerCase())) {
                return { ...e, estado: "disponible" as EstadoEquipo, updatedAt: Date.now() };
              }
              return e;
            })
          : get().equipos;

        // Log de auditoría
        get().addAuditLog({
          accion: "delete_transferencia",
          entidad: "transferencia",
          entidadId: nOperacion,
          descripcion: `Operación ${nOperacion} — ${delets.length} item(s), ${totalUnidades} unidades, ${totalSeries} series restauradas`,
          detalles: JSON.stringify({
            nOperacion,
            items: delets.length,
            totalUnidades,
            totalSeries,
            seriesRestauradas: seriesRestore.slice(0, 50),
          }),
        });

        set({
          despachos: get().despachos.filter((d) => d.nOperacion !== nOperacion),
          products: productsUpdated,
          equipos: equiposUpdated,
        });
      },

      // ─── Equipos ───
      findEquipmentBySerie: (serie) => {
        const norm = serie.trim().toLowerCase();
        return get().equipos.find((e) => e.serie.trim().toLowerCase() === norm) ?? null;
      },

      addEquipment: (e) => {
        const serieTrim = e.serie.trim();
        const modeloTrim = e.modelo.trim();
        if (!serieTrim || !modeloTrim) return null;
        if (get().findEquipmentBySerie(serieTrim)) return null;
        const eq: Equipment = {
          id: uid(),
          ...e,
          serie: serieTrim,
          modelo: modeloTrim,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ equipos: [eq, ...get().equipos] });
        return eq.id;
      },

      addEquipmentBulk: ({ series, modelo, estado, ubicacion, observacion }) => {
        const modeloTrim = modelo.trim();
        let ok = 0;
        let dup = 0;
        const nuevos: Equipment[] = [];
        const existentes = new Set(get().equipos.map((e) => e.serie.trim().toLowerCase()));
        const ts = Date.now();
        for (const raw of series) {
          const s = normalizaSerie(raw);
          if (!s) continue;
          if (existentes.has(s.toLowerCase())) { dup++; continue; }
          existentes.add(s.toLowerCase());
          nuevos.push({
            id: uid(),
            serie: s,
            modelo: modeloTrim,
            estado,
            ubicacion,
            observacion,
            createdAt: ts,
            updatedAt: ts,
          });
          ok++;
        }
        if (nuevos.length > 0) set({ equipos: [...nuevos, ...get().equipos] });
        return { ok, dup };
      },

      updateEquipment: (id, data) =>
        set({
          equipos: get().equipos.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
          ),
        }),

      deleteEquipment: (id) => {
        const eq = get().equipos.find((e) => e.id === id);
        if (!eq) return;
        get().addAuditLog({
          accion: "delete_equipment",
          entidad: "equipo",
          entidadId: id,
          descripcion: `Equipo "${eq.modelo}" (serie ${eq.serie}) — estado ${eq.estado}`,
          detalles: JSON.stringify({ serie: eq.serie, modelo: eq.modelo, estado: eq.estado, ubicacion: eq.ubicacion }),
        });
        set({ equipos: get().equipos.filter((e) => e.id !== id) });
      },

      deleteEquipmentBulk: (ids) => {
        // Loggear cada eliminación
        for (const id of ids) {
          const eq = get().equipos.find((e) => e.id === id);
          if (eq) {
            get().addAuditLog({
              accion: "delete_equipment",
              entidad: "equipo",
              entidadId: id,
              descripcion: `Equipo "${eq.modelo}" (serie ${eq.serie}) — eliminado en bulk`,
              detalles: JSON.stringify({ serie: eq.serie, modelo: eq.modelo, estado: eq.estado }),
            });
          }
        }
        set({ equipos: get().equipos.filter((e) => !ids.includes(e.id)) });
      },

      // ─── Bloc ───
      addNota: (texto) =>
        set({
          notas: [
            { id: uid(), texto: texto.trim(), fecha: Date.now(), pinned: false },
            ...get().notas,
          ],
        }),
      togglePinNota: (id) =>
        set({
          notas: get().notas.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        }),
      deleteNota: (id) => {
        const n = get().notas.find((x) => x.id === id);
        if (!n) return;
        get().addAuditLog({
          accion: "delete_nota",
          entidad: "nota",
          entidadId: id,
          descripcion: `Nota: "${n.texto.slice(0, 80)}${n.texto.length > 80 ? "…" : ""}"`,
          detalles: JSON.stringify({ texto: n.texto, pinned: n.pinned }),
        });
        set({ notas: get().notas.filter((x) => x.id !== id) });
      },

      // ─── Horario de almacén ───
      addHorarioItem: (item) =>
        set({
          horario: [
            ...get().horario,
            {
              id: uid(),
              dia: item.dia,
              horaInicio: item.horaInicio,
              horaFin: item.horaFin,
              actividad: item.actividad.trim(),
              tipo: item.tipo,
            },
          ],
        }),
      updateHorarioItem: (id, data) =>
        set({
          horario: get().horario.map((h) =>
            h.id === id
              ? {
                  ...h,
                  ...data,
                  actividad: data.actividad !== undefined ? data.actividad.trim() : h.actividad,
                }
              : h
          ),
        }),
      deleteHorarioItem: (id) => {
        const h = get().horario.find((x) => x.id === id);
        if (h) {
          get().addAuditLog({
            accion: "delete_horario",
            entidad: "horario",
            entidadId: id,
            descripcion: `Horario: ${h.dia} ${h.horaInicio}–${h.horaFin} · ${h.actividad}`,
            detalles: JSON.stringify({ dia: h.dia, horaInicio: h.horaInicio, horaFin: h.horaFin, actividad: h.actividad, tipo: h.tipo }),
          });
        }
        set({ horario: get().horario.filter((x) => x.id !== id) });
      },
      marcarHorarioDisparado: (id, fechaISO) =>
        set({
          horario: get().horario.map((h) =>
            h.id === id ? { ...h, ultimoDisparo: fechaISO } : h
          ),
        }),
      checkHorario: () => {
        const ahora = new Date();
        const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaHoy = dias[ahora.getDay()] as Horario["dia"];
        const hh = ahora.getHours().toString().padStart(2, "0");
        const mm = ahora.getMinutes().toString().padStart(2, "0");
        const ahoraStr = `${hh}:${mm}`;
        // Usar fecha local (YYYY-MM-DD) en lugar de UTC para evitar desfases horarios
        const fechaISO = `${ahora.getFullYear()}-${(ahora.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${ahora.getDate().toString().padStart(2, "0")}`;
        // Disparamos si la hora actual está dentro del rango [horaInicio, horaFin)
        // y no se disparó hoy todavía. Así no dependemos de coincidencia exacta de minuto.
        return get().horario.filter(
          (h) =>
            h.dia === diaHoy &&
            h.horaInicio <= ahoraStr &&
            ahoraStr < h.horaFin &&
            h.ultimoDisparo !== fechaISO
        );
      },

      // ─── Memoria de aprendizaje de Alana ───
      addMemoria: (texto) => {
        const t = texto.trim();
        if (!t) return;
        const existente = get().memoriaIA.find(
          (x) => x.trim().toLowerCase() === t.toLowerCase()
        );
        if (existente) return;
        // máximo 50 aprendizajes
        const nuevas = [...get().memoriaIA, t].slice(-50);
        set({ memoriaIA: nuevas });
      },
      deleteMemoria: (index) =>
        set({ memoriaIA: get().memoriaIA.filter((_, i) => i !== index) }),
      clearMemoria: () => set({ memoriaIA: [] }),

      // ─── Recordatorios (controlados por la IA) ───
      addRecordatorio: (texto, cuando, origen = "ia") => {
        const id = uid();
        const nuevo: Recordatorio = {
          id,
          texto: texto.trim(),
          fecha: Date.now(),
          cuando,
          disparado: false,
          origen,
        };
        set({ recordatorios: [...get().recordatorios, nuevo] });
        return id;
      },
      deleteRecordatorio: (id) =>
        set({ recordatorios: get().recordatorios.filter((r) => r.id !== id) }),
      marcarRecordatorioDisparado: (id) =>
        set({
          recordatorios: get().recordatorios.map((r) =>
            r.id === id ? { ...r, disparado: true } : r
          ),
        }),
      checkRecordatorios: () => {
        const ahora = Date.now();
        const pendientes = get().recordatorios.filter(
          (r) => !r.disparado && r.cuando <= ahora
        );
        return pendientes;
      },

      // ─── Notificaciones (estilo iPhone) ───
      addNotificacion: (titulo, cuerpo, tipo = "info") => {
        const id = uid();
        const nueva: Notificacion = {
          id,
          titulo,
          cuerpo,
          tipo,
          fecha: Date.now(),
          leida: false,
        };
        // Mantener máximo 20 notificaciones
        const todas = [nueva, ...get().notificaciones].slice(0, 20);
        set({ notificaciones: todas });
        return id;
      },
      markNotificacionLeida: (id) =>
        set({
          notificaciones: get().notificaciones.map((n) =>
            n.id === id ? { ...n, leida: true } : n
          ),
        }),
      clearNotificaciones: () => set({ notificaciones: [] }),
      clearNotificacionesLeidas: () =>
        set({ notificaciones: get().notificaciones.filter((n) => !n.leida) }),

      // ─── Empresa / miembros ───
      updateEmpresa: (data) => set({ empresa: { ...get().empresa, ...data } }),

      addMiembro: (nombre, rol, correo, telefono) =>
        set({
          miembros: [
            ...get().miembros,
            {
              id: uid(),
              nombre: nombre.trim(),
              rol,
              correo: correo?.trim() || undefined,
              telefono: telefono?.trim() || undefined,
              activo: true,
            },
          ],
        }),
      updateMiembro: (id, data) =>
        set({
          miembros: get().miembros.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }),
      deleteMiembro: (id) => {
        const m = get().miembros.find((x) => x.id === id);
        if (m) {
          get().addAuditLog({
            accion: "delete_miembro",
            entidad: "miembro",
            entidadId: id,
            descripcion: `Miembro: ${m.nombre} (${m.rol})`,
            detalles: JSON.stringify({ nombre: m.nombre, rol: m.rol, activo: m.activo }),
          });
        }
        set({ miembros: get().miembros.filter((x) => x.id !== id) });
      },

      // ─── Export ───
      exportInventarioExcel: () => {
        import("xlsx-js-style").then((XLSX: any) => {
          const productos = get().products;
          const empresa = get().empresa;
          const settings = get().settings;
          const usuario = settings.usuario || "Iker";
          const ahora = new Date();
          const fechaStr = ahora.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
          const horaStr = ahora.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });

          // Paleta corporativa (gris mate, sin morado/neón)
          const C = {
            headerBg: "1F1F1F",       // casi negro
            headerFg: "FFFFFF",
            subBg: "2A2A2A",
            subFg: "E5E5E5",
            infoLabelBg: "EFEFEF",
            infoLabelFg: "1A1A1A",
            infoValueBg: "FFFFFF",
            infoValueFg: "1A1A1A",
            tableHeaderBg: "3A3A3A",
            tableHeaderFg: "FFFFFF",
            rowAlt: "F5F5F5",
            rowNormal: "FFFFFF",
            dangerBg: "FCE4E4",
            dangerFg: "9B1C1C",
            warnBg: "FFF4D6",
            warnFg: "92500A",
            okBg: "DCFCE7",
            okFg: "166534",
            border: "B0B0B0",
          };

          const borderAll = {
            top: { style: "thin", color: { rgb: C.border } },
            bottom: { style: "thin", color: { rgb: C.border } },
            left: { style: "thin", color: { rgb: C.border } },
            right: { style: "thin", color: { rgb: C.border } },
          };

          // ─── Cálculos ───
          const totalUnidades = productos.reduce((s, p) => s + p.quantity, 0);
          const bajoStock = productos.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
          const bajoCount = bajoStock.length;
          const udmMap: Record<string, number> = {};
          for (const p of productos) {
            const k = p.udm ?? "Sin UDM";
            udmMap[k] = (udmMap[k] ?? 0) + p.quantity;
          }

          // ─── Construir filas (aoa) ───
          const ncols = 9;
          const rows: any[][] = [];

          // Fila 1: Título principal
          rows.push(["INVENTARIO VRS", "", "", "", "", "", "", "", ""]);
          // Fila 2: subtítulo empresa
          rows.push([empresa.nombre || "VRS", "", "", "", "", "", "", "", ""]);
          // Fila 3: vacía
          rows.push(Array(ncols).fill(""));
          // Fila 4-7: bloque info
          rows.push(["Exportado por:", usuario, "", "Fecha:", fechaStr, "", "Hora:", horaStr, ""]);
          rows.push(["Productos en catálogo:", productos.length, "", "Unidades totales:", totalUnidades.toLocaleString("es-PE"), "", "Productos en bajo stock:", bajoCount, ""]);
          rows.push(["Empresa:", empresa.nombre || "VRS", "", "RUC:", empresa.ruc || "—", "", "Teléfono:", empresa.telefono || "—", ""]);
          rows.push(["Dirección:", empresa.direccion || "—", "", "Correo:", empresa.correo || "—", "", "", "", ""]);
          // Fila 8: vacía
          rows.push(Array(ncols).fill(""));
          // Fila 9: encabezado de tabla
          rows.push(["SKU", "PRODUCTO", "STOCK ACTUAL", "STOCK MÍNIMO", "UDM", "ESTADO", "VALOR UNIT. (S/)", "VALOR TOTAL (S/)", "OBSERVACIONES"]);
          // Filas de datos
          for (const p of productos) {
            const estado = !p.minStock || p.minStock === 0
              ? "Sin mínimo"
              : p.quantity <= p.minStock
              ? "BAJO STOCK"
              : p.quantity <= p.minStock * 1.5
              ? "Por agotarse"
              : "OK";
            rows.push([
              p.sku,
              p.name,
              p.quantity,
              p.minStock ?? "",
              p.udm ?? "",
              estado,
              "", // valor unitario (lo llena el usuario)
              "", // valor total (lo llena el usuario)
              "",
            ]);
          }
          // Fila vacía
          rows.push(Array(ncols).fill(""));
          // Fila de totales
          rows.push(["TOTALES", "", totalUnidades, "", "", `${bajoCount} bajo stock`, "", "", ""]);

          const ws = XLSX.utils.aoa_to_sheet(rows);

          // ─── Merges ───
          ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } }, // título
            { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } }, // subtítulo empresa
            { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
            { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
            { s: { r: 3, c: 7 }, e: { r: 3, c: 8 } },
            { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
            { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
            { s: { r: 4, c: 7 }, e: { r: 4, c: 8 } },
            { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
            { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
            { s: { r: 5, c: 7 }, e: { r: 5, c: 8 } },
            { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },
            { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },
            { s: { r: 6, c: 7 }, e: { r: 6, c: 8 } },
            { s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: 2 } },
            { s: { r: rows.length - 1, c: 3 }, e: { r: rows.length - 1, c: 4 } },
            { s: { r: rows.length - 1, c: 5 }, e: { r: rows.length - 1, c: 8 } },
          ];

          // ─── Ancho de columnas ───
          ws["!cols"] = [
            { wch: 14 },  // SKU
            { wch: 42 },  // PRODUCTO
            { wch: 14 },  // STOCK
            { wch: 14 },  // MÍN
            { wch: 12 },  // UDM
            { wch: 14 },  // ESTADO
            { wch: 16 },  // VALOR UNIT
            { wch: 16 },  // VALOR TOTAL
            { wch: 28 },  // OBSERVACIONES
          ];

          // ─── Alto de filas ───
          ws["!rows"] = [];
          ws["!rows"][0] = { hpt: 32 };
          ws["!rows"][1] = { hpt: 20 };
          ws["!rows"][8] = { hpt: 26 };

          // ─── Aplicar estilos ───
          const setStyle = (addr: string, style: any) => {
            if (!ws[addr]) ws[addr] = { t: "s", v: "" };
            ws[addr].s = { ...(ws[addr].s || {}), ...style };
          };

          // Fila 1: título
          setStyle("A1", {
            font: { name: "Calibri", sz: 22, bold: true, color: { rgb: C.headerFg } },
            fill: { fgColor: { rgb: C.headerBg } },
            alignment: { horizontal: "center", vertical: "center" },
          });
          // Fila 2: subtítulo empresa
          setStyle("A2", {
            font: { name: "Calibri", sz: 12, bold: true, color: { rgb: C.subFg } },
            fill: { fgColor: { rgb: C.subBg } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          // Bloque info (filas 4-7, índices 3-6)
          const infoLabelCells = ["A4", "D4", "G4", "A5", "D5", "G5", "A6", "D6", "G6", "A7", "D7"];
          const infoValueCells = ["B4", "E4", "H4", "B5", "E5", "H5", "B6", "E6", "H6", "B7", "E7"];
          for (const c of infoLabelCells) {
            setStyle(c, {
              font: { name: "Calibri", sz: 10, bold: true, color: { rgb: C.infoLabelFg } },
              fill: { fgColor: { rgb: C.infoLabelBg } },
              alignment: { horizontal: "left", vertical: "center", indent: 1 },
              border: borderAll,
            });
          }
          for (const c of infoValueCells) {
            setStyle(c, {
              font: { name: "Calibri", sz: 10, color: { rgb: C.infoValueFg } },
              fill: { fgColor: { rgb: C.infoValueBg } },
              alignment: { horizontal: "left", vertical: "center", indent: 1 },
              border: borderAll,
            });
          }

          // Encabezado de tabla (fila 9, índice 8)
          const headerCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
          for (const col of headerCols) {
            setStyle(`${col}9`, {
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C.tableHeaderFg } },
              fill: { fgColor: { rgb: C.tableHeaderBg } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: borderAll,
            });
          }

          // Filas de datos (empiezan en fila 10, índice 9)
          const dataStartRow = 9;
          for (let i = 0; i < productos.length; i++) {
            const rowIdx = dataStartRow + i;
            const excelRow = rowIdx + 1;
            const isAlt = i % 2 === 1;
            const rowBg = isAlt ? C.rowAlt : C.rowNormal;

            const p = productos[i];
            const isBajo = !!(p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
            const isWarn = !!(p.minStock && p.minStock > 0 && p.quantity > p.minStock && p.quantity <= p.minStock * 1.5);
            const estadoBg = isBajo ? C.dangerBg : isWarn ? C.warnBg : C.okBg;
            const estadoFg = isBajo ? C.dangerFg : isWarn ? C.warnFg : C.okFg;

            for (let c = 0; c < ncols; c++) {
              const addr = `${headerCols[c]}${excelRow}`;
              const isEstadoCol = c === 5;
              const isNumberCol = c === 2 || c === 3;
              const isMoneyCol = c === 6 || c === 7;
              setStyle(addr, {
                font: {
                  name: "Calibri",
                  sz: 10,
                  bold: isEstadoCol,
                  color: { rgb: isEstadoCol ? estadoFg : "1A1A1A" },
                },
                fill: { fgColor: { rgb: isEstadoCol ? estadoBg : rowBg } },
                alignment: {
                  horizontal: isEstadoCol || isNumberCol || isMoneyCol ? "center" : "left",
                  vertical: "center",
                  indent: isNumberCol || isMoneyCol || isEstadoCol ? 0 : 1,
                },
                border: borderAll,
                numFmt: isMoneyCol ? '"S/" #,##0.00' : isNumberCol ? "#,##0" : undefined,
              });
            }
          }

          // Fila de totales
          const totalRowIdx = rows.length - 1;
          const totalExcelRow = totalRowIdx + 1;
          for (let c = 0; c < ncols; c++) {
            const addr = `${headerCols[c]}${totalExcelRow}`;
            setStyle(addr, {
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: C.headerBg } },
              alignment: { horizontal: c === 0 || c === 2 || c === 5 ? "center" : "left", vertical: "center" },
              border: borderAll,
            });
          }

          // ─── Hoja 2: Resumen por UDM ───
          const resumenRows: any[][] = [
            ["RESUMEN POR UNIDAD DE MEDIDA", "", ""],
            ["", "", ""],
            ["UDM", "UNIDADES TOTALES", "% DEL TOTAL"],
          ];
          const udmEntries = Object.entries(udmMap).sort((a, b) => b[1] - a[1]);
          for (const [udm, count] of udmEntries) {
            const pct = totalUnidades > 0 ? (count / totalUnidades) * 100 : 0;
            resumenRows.push([udm, count, `${pct.toFixed(1)}%`]);
          }
          resumenRows.push(["", "", ""]);
          resumenRows.push(["TOTAL", totalUnidades, "100%"]);

          const ws2 = XLSX.utils.aoa_to_sheet(resumenRows);
          ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
          ws2["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 16 }];
          ws2["!rows"] = [{ hpt: 28 }];

          const setStyle2 = (addr: string, style: any) => {
            if (!ws2[addr]) ws2[addr] = { t: "s", v: "" };
            ws2[addr].s = { ...(ws2[addr].s || {}), ...style };
          };
          setStyle2("A1", {
            font: { name: "Calibri", sz: 16, bold: true, color: { rgb: C.headerFg } },
            fill: { fgColor: { rgb: C.headerBg } },
            alignment: { horizontal: "center", vertical: "center" },
          });
          for (const col of ["A", "B", "C"]) {
            setStyle2(`${col}3`, {
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C.tableHeaderFg } },
              fill: { fgColor: { rgb: C.tableHeaderBg } },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderAll,
            });
          }
          for (let i = 0; i < udmEntries.length; i++) {
            const excelRow = 4 + i;
            const isAlt = i % 2 === 1;
            const rowBg = isAlt ? C.rowAlt : C.rowNormal;
            for (const col of ["A", "B", "C"]) {
              setStyle2(`${col}${excelRow}`, {
                font: { name: "Calibri", sz: 10, color: { rgb: "1A1A1A" } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: col === "A" ? "left" : "center", vertical: "center", indent: col === "A" ? 1 : 0 },
                border: borderAll,
              });
            }
          }
          const totalResRow = 4 + udmEntries.length + 1;
          for (const col of ["A", "B", "C"]) {
            setStyle2(`${col}${totalResRow}`, {
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: C.headerBg } },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderAll,
            });
          }

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
          XLSX.utils.book_append_sheet(wb, ws2, "Resumen por UDM");
          XLSX.writeFile(wb, `Inventario_VRS_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
      },

      // ─── Export pistoleo a Excel (con MAC, CM MAC, MTA MAC, UA) ───
      exportarPistoleoExcel: () => {
        import("xlsx-js-style").then((XLSX: any) => {
          const filas = get().pistoleoFilas;
          const estado = get().pistoleoEstado;
          const empresa = get().empresa;
          const settings = get().settings;
          const usuario = settings.usuario || "Iker";
          const ahora = new Date();
          const fechaStr = ahora.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
          const horaStr = ahora.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });

          // Todos los campos posibles, en orden
          const ORDEN = ["serie", "cmMac", "mtaMac", "ua"];
          const LABELS: Record<string, string> = {
            serie: "Serie",
            cmMac: "CM MAC",
            mtaMac: "MTA MAC",
            ua: "UA",
          };

          // Determinar qué campos aparecen en TODAS las filas combinadas (unión)
          const todosLosCamposUsados = new Set<string>();
          for (const f of filas) {
            const cf = (f.camposMarcados && f.camposMarcados.length > 0)
              ? f.camposMarcados
              : (get().pistoleoCamposMarcados || ["serie"]);
            for (const c of cf) todosLosCamposUsados.add(c);
          }
          const camposAExportar = ORDEN.filter((c) => todosLosCamposUsados.has(c));

          // Construir encabezados
          const headers = ["#"];
          for (const c of camposAExportar) headers.push(LABELS[c]);
          headers.push("Modelo");
          headers.push("Estado");
          headers.push("Fecha captura");

          // Colores corporativos
          const C = {
            headerBg: "1F1F1F",
            headerFg: "FFFFFF",
            rowAlt: "F5F5F5",
            rowNormal: "FFFFFF",
            border: "B0B0B0",
          };
          const borderAll = {
            top: { style: "thin", color: { rgb: C.border } },
            bottom: { style: "thin", color: { rgb: C.border } },
            left: { style: "thin", color: { rgb: C.border } },
            right: { style: "thin", color: { rgb: C.border } },
          };

          const rows: any[][] = [];
          // Título
          rows.push(["SERIES CAPTURADAS — VRS"]);
          rows.push([`Empresa: ${empresa.nombre || "VRS"}  ·  Fecha: ${fechaStr}  ·  Hora: ${horaStr}  ·  Usuario: ${usuario}`]);
          rows.push([`Campos: ${camposAExportar.map((c) => LABELS[c]).join(" · ")}  ·  Total: ${filas.length}  ·  Estado destino: ${estado}`]);
          rows.push([]);
          // Headers
          rows.push(headers);

          // Filas de datos — cada fila usa SUS propios campos marcados para mapear valores
          filas.forEach((f, i) => {
            const camposFila = (f.camposMarcados && f.camposMarcados.length > 0)
              ? f.camposMarcados
              : (get().pistoleoCamposMarcados || ["serie"]);
            const camposOrdenFila = ORDEN.filter((c) => camposFila.includes(c));
            const idxFila = (campo: string) => camposOrdenFila.indexOf(campo);
            const row: any[] = [];
            row.push(i + 1);
            for (const c of camposAExportar) {
              row.push(f.valores[idxFila(c)] ?? "");
            }
            row.push(f.modeloSeleccionado || "");
            row.push(estado);
            row.push(new Date(f.timestamp).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
            rows.push(row);
          });

          const ws = XLSX.utils.aoa_to_sheet(rows);
          const ncols = headers.length;

          // Merges para título
          ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } },
          ];

          // Ancho columnas
          ws["!cols"] = headers.map((h) => {
            if (h === "#") return { wch: 5 };
            if (h === "Serie") return { wch: 22 };
            if (h === "MAC" || h === "CM MAC" || h === "MTA MAC") return { wch: 20 };
            if (h === "UA") return { wch: 16 };
            if (h === "Modelo") return { wch: 36 };
            if (h === "Estado") return { wch: 14 };
            return { wch: 18 };
          });

          // Estilos
          const setStyle = (addr: string, style: any) => {
            if (!ws[addr]) ws[addr] = { t: "s", v: "" };
            ws[addr].s = { ...(ws[addr].s || {}), ...style };
          };

          // Título
          setStyle("A1", {
            font: { name: "Calibri", sz: 16, bold: true, color: { rgb: C.headerFg } },
            fill: { fgColor: { rgb: C.headerBg } },
            alignment: { horizontal: "center", vertical: "center" },
          });
          setStyle("A2", {
            font: { name: "Calibri", sz: 10, color: { rgb: "555555" } },
            alignment: { horizontal: "center", vertical: "center" },
          });
          setStyle("A3", {
            font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "555555" } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          // Headers (fila 5, índice 4)
          const headerRow = 5;
          for (let c = 0; c < ncols; c++) {
            const col = XLSX.utils.encode_cell({ r: headerRow - 1, c });
            setStyle(col, {
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C.headerFg } },
              fill: { fgColor: { rgb: C.headerBg } },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderAll,
            });
          }

          // Filas de datos
          for (let i = 0; i < filas.length; i++) {
            const excelRow = headerRow + 1 + i;
            const isAlt = i % 2 === 1;
            const rowBg = isAlt ? C.rowAlt : C.rowNormal;
            for (let c = 0; c < ncols; c++) {
              const col = XLSX.utils.encode_cell({ r: excelRow - 1, c });
              setStyle(col, {
                font: { name: "Calibri", sz: 10, color: { rgb: "1A1A1A" } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: c === 0 || c >= 5 ? "center" : "left", vertical: "center" },
                border: borderAll,
              });
            }
          }

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Series Capturadas");
          XLSX.writeFile(wb, `Series_Pistoleo_VRS_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
      },

      // ─── Config ───
      setSetting: (key, value) =>
        set({ settings: { ...get().settings, [key]: value } }),

      clearAllData: () =>
        set({
          products: [],
          equipos: [],
          entradas: [],
          despachos: [],
          notas: [],
          recordatorios: [],
          notificaciones: [],
          miembros: [],
          empresa: { ...DEFAULT_EMPRESA },
          settings: { ...DEFAULT_SETTINGS },
          activeView: "dashboard",
          pistoleoFilas: [],
          pistoleoCampo: "serie",
          pistoleoModelo: "",
          pistoleoEstado: "disponible",
          pistoleoUbicacion: "",
          pistoleoModeloSeleccionado: "",
          horario: [],
          memoriaIA: [],
          bajoStockVisto: 0,
          sesionUsuarioId: null,
        }),

      // ─── Demo data (siempre limpia y carga) ───
      seedDemo: () => {
        // Limpiar primero
        set({
          products: [],
          equipos: [],
          entradas: [],
          despachos: [],
          notas: [],
          recordatorios: [],
          notificaciones: [],
          miembros: [],
          pistoleoFilas: [],
          pistoleoModeloSeleccionado: "",
          horario: [],
        });

        // Horario demo (Lunes-Viernes)
        const horarioDemo: Array<Omit<Horario, "id">> = [
          { dia: "lunes", horaInicio: "08:00", horaFin: "09:00", actividad: "Despacho matutino", tipo: "despacho" },
          { dia: "lunes", horaInicio: "13:00", horaFin: "14:00", actividad: "Almuerzo", tipo: "almuerzo" },
          { dia: "lunes", horaInicio: "15:00", horaFin: "16:00", actividad: "Reunión de coordinación", tipo: "reunion" },
          { dia: "martes", horaInicio: "08:00", horaFin: "09:00", actividad: "Despacho matutino", tipo: "despacho" },
          { dia: "martes", horaInicio: "13:00", horaFin: "14:00", actividad: "Almuerzo", tipo: "almuerzo" },
          { dia: "miercoles", horaInicio: "08:00", horaFin: "09:00", actividad: "Despacho matutino", tipo: "despacho" },
          { dia: "miercoles", horaInicio: "10:00", horaFin: "11:00", actividad: "Inventario físico semanal", tipo: "otro" },
          { dia: "jueves", horaInicio: "08:00", horaFin: "09:00", actividad: "Despacho matutino", tipo: "despacho" },
          { dia: "viernes", horaInicio: "08:00", horaFin: "09:00", actividad: "Despacho matutino", tipo: "despacho" },
          { dia: "viernes", horaInicio: "16:00", horaFin: "17:00", actividad: "Cierre semanal", tipo: "reunion" },
        ];
        for (const h of horarioDemo) get().addHorarioItem(h);

        // 10 productos
        const demo: [string, string, number, number?, string?][] = [
          ["1066990", "CONECTOR FIBRA OPTICA FTTH PPC", 41, 10, "UNIDADES"],
          ["1002900", "CONECTOR PLUG RJ-45", 2768, 100, "UNIDADES"],
          ["1002950", "ATADOR DE IDENTIFICACION DE ABONADO", 1475, 50, "UNIDADES"],
          ["1003101", "CABLE COAXIAL RG-6 AUTOSOPORTADO", 6794, 200, "METROS"],
          ["1004705", "CABLE COAXIAL BLANCO RG-6 S/MENSAJERO", 3121, 100, "METROS"],
          ["1004692", "CABLE UTP CAT5E FTP 4PR/24AWG", 15921, 500, "METROS"],
          ["4076358", "ROUTER ONT HG8145X6-13 50088770 HUAWEI", 29, 5, "UNIDADES"],
          ["4048528", "MODEM ARRIS TG2482 24X8 3.0 S/BAT", 12, 3, "UNIDADES"],
          ["4073653", "ROUTER K562E-10 50087708 HUAWEI", 16, 3, "UNIDADES"],
          ["4072704", "DECODIFICADOR IPTV ZXVAB B866V2-H ZTE", 67, 5, "UNIDADES"],
        ];
        for (const [sku, name, qty, min, udm] of demo) get().addProduct(sku, name, qty, min, udm);

        // 7 equipos
        const demoEq: [string, string, EstadoEquipo, string?][] = [
          ["48575443365E42B7", "ROUTER ONT HG8145X6-13 HUAWEI", "disponible", "Almacén HUB"],
          ["48575443365E42C8", "ROUTER ONT HG8145X6-13 HUAWEI", "disponible", "Almacén HUB"],
          ["48575443365E42D1", "ROUTER ONT HG8145X6-13 HUAWEI", "averiado", "Taller"],
          ["SN10002ABC", "DECODIFICADOR IPTV ZXVAB B866V2-H ZTE", "disponible", "Almacén HUB"],
          ["SN10003DEF", "DECODIFICADOR IPTV ZXVAB B866V2-H ZTE", "en_retiro", "Taller"],
          ["MACA0B1C2D3E", "REPETIDOR ZXHN H3601P ZTE", "disponible", "Almacén HUB"],
          ["MACA0B1C2D3F", "REPETIDOR ZXHN H3601P ZTE", "averiado", "Taller"],
        ];
        for (const [serie, modelo, estado, ubi] of demoEq)
          get().addEquipment({ serie, modelo, estado, ubicacion: ubi });

        // 3 notas
        get().addNota("Traer 50 conectores FTTH para mañana - pedido urgente del personal Pérez");
        get().addNota("Router con serie 48575443365E42D1 no enciende - llevar a taller");
        get().addNota("Verificar stock de cable RG-6, parece bajo");

        // Personal: solo el admin por defecto (el resto lo añade el admin)
        get().addMiembro("Iker", "administrador", "iker@lemcorp.com", undefined);
      },
    }),
    {
      name: "lemcorp-v3",
      partialize: (s) => ({
        products: s.products,
        equipos: s.equipos,
        entradas: s.entradas,
        despachos: s.despachos,
        notas: s.notas,
        recordatorios: s.recordatorios,
        notificaciones: s.notificaciones,
        miembros: s.miembros,
        empresa: s.empresa,
        settings: s.settings,
        activeView: s.activeView,
        pistoleoCampo: s.pistoleoCampo,
        pistoleoModelo: s.pistoleoModelo,
        pistoleoEstado: s.pistoleoEstado,
        pistoleoUbicacion: s.pistoleoUbicacion || "",
        pistoleoFilas: s.pistoleoFilas,
        pistoleoModeloSeleccionado: s.pistoleoModeloSeleccionado,
        pistoleoCamposMarcados: s.pistoleoCamposMarcados,
        horario: s.horario,
        memoriaIA: s.memoriaIA,
        bajoStockVisto: s.bajoStockVisto,
        sesionUsuarioId: s.sesionUsuarioId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Mark as hydrated so the SyncProvider knows it can pull.
          (state as any)._hasHydrated = true;
        }
      },
      migrate: (p: any) => {
        if (!p) return p;
        if (!Array.isArray(p.products)) p.products = [];
        if (!Array.isArray(p.equipos)) p.equipos = [];
        if (!Array.isArray(p.entradas)) p.entradas = [];
        if (!Array.isArray(p.despachos)) p.despachos = [];
        if (!Array.isArray(p.notas)) p.notas = [];
        if (!Array.isArray(p.recordatorios)) p.recordatorios = [];
        if (!Array.isArray(p.notificaciones)) p.notificaciones = [];
        if (!Array.isArray(p.miembros)) p.miembros = [];
        if (!Array.isArray(p.pistoleoFilas)) p.pistoleoFilas = [];
        if (!Array.isArray(p.horario)) p.horario = [];
        if (!Array.isArray(p.memoriaIA)) p.memoriaIA = [];
        if (!p.empresa) p.empresa = { ...DEFAULT_EMPRESA };
        // Migrar empresa: si era "VRS" o vacío, cambiar a "VRS"
        if (!p.empresa.nombre || p.empresa.nombre === "VRS") {
          p.empresa = { ...DEFAULT_EMPRESA, ...p.empresa, nombre: "VRS" };
        }
        // Mergear settings con defaults (para añadir campos nuevos)
        const mergedSettings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
        // Migrar usuario "Admin" → "Iker" (si era el default anterior)
        if (mergedSettings.usuario === "Admin" || !mergedSettings.usuario) {
          mergedSettings.usuario = "Iker";
        }
        p.settings = mergedSettings;
        if (!p.pistoleoCampo) p.pistoleoCampo = "serie";
        if (!p.pistoleoModelo) p.pistoleoModelo = "";
        if (!p.pistoleoEstado) p.pistoleoEstado = "disponible";
        if (p.pistoleoUbicacion === undefined) p.pistoleoUbicacion = "";
        if (!Array.isArray(p.pistoleoCamposMarcados)) p.pistoleoCamposMarcados = ["serie"];
        // Normalizar products.quantity
        p.products = p.products.map((x: any) => ({
          ...x,
          quantity: typeof x.quantity === "number" ? x.quantity : 0,
        }));
        // Si el usuario ya tiene datos (productos o equipos), marcar onboarding como hecho
        // para no obligarlo a pasar por el wizard de configuración inicial.
        try {
          if (
            (Array.isArray(p.products) && p.products.length > 0) ||
            (Array.isArray(p.equipos) && p.equipos.length > 0)
          ) {
            localStorage.setItem("lemcorp-onboarding-done-v1", "1");
          }
        } catch {
          /* localStorage puede no estar disponible */
        }
        return p;
      },
      version: 11,
    }
  )
);
