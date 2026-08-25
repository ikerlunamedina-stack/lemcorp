// Store global LEMCORP WMS — Zustand + persist (localStorage)
// Premium build — REBUILD-1

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveView,
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
  pistoleoFilas: FilaPistoleo[];
  /** Equipo del inventario seleccionado para aplicar a nuevas capturas */
  pistoleoModeloSeleccionado: string;

  // ─── Acciones: navegación ───
  setActiveView: (v: ActiveView) => void;

  // ─── Acciones: notificaciones ───
  marcarBajoStockVisto: (count: number) => void;

  // ─── Acciones: pistoleo ───
  setPistoleoConfig: (patch: Partial<{
    pistoleoCampo: PistoleoCampo;
    pistoleoModelo: string;
    pistoleoEstado: EstadoEquipo;
    pistoleoModeloSeleccionado: string;
  }>) => void;
  addPistoleoFila: (valores: string[], modeloSeleccionado?: string) => void;
  updatePistoleoFila: (id: string, valores: string[], modeloSeleccionado?: string) => void;
  deletePistoleoFila: (id: string) => void;
  clearPistoleoFilas: () => void;
  confirmarPistoleo: () => { ok: boolean; msg: string; count: number; duplicados?: string[] };

  // ─── Acciones: inventario ───
  addProduct: (sku: string, name: string, quantity: number, minStock?: number, udm?: string) => string | null;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  findProductBySku: (sku: string) => Product | null;
  importProductsBulk: (items: { sku: string; name: string; quantity: number; minStock?: number; udm?: string }[]) => { ok: number; dup: number };

  // ─── Acciones: entradas ───
  registrarEntrada: (input: string) => { ok: boolean; msg: string; count: number };
  deleteEntrada: (id: string) => void;

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

      horario: [],
      memoriaIA: [],

      bajoStockVisto: 0,

      sesionUsuarioId: null,

      activeView: "dashboard",

      // pistoleo
      pistoleoCampo: "serie",
      pistoleoModelo: "",
      pistoleoEstado: "disponible",
      pistoleoFilas: [],
      pistoleoModeloSeleccionado: "",

      // ─── Navegación ───
      setActiveView: (v) => set({ activeView: v }),

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
      addPistoleoFila: (valores, modeloSeleccionado) =>
        set({
          pistoleoFilas: [
            {
              id: uid(),
              valores: valores.map((v) => v.trim()),
              timestamp: Date.now(),
              modeloSeleccionado,
            },
            ...get().pistoleoFilas,
          ],
        }),
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
        const { pistoleoModelo, pistoleoEstado, pistoleoCampo } = get();
        let count = 0;
        const nuevos: Equipment[] = [];
        const existentes = new Set(get().equipos.map((e) => e.serie.trim().toLowerCase()));
        const duplicadosNoGuardados: string[] = [];
        const fechasNow = Date.now();
        for (const f of filas) {
          const serie = (f.valores[0] ?? "").trim();
          if (!serie) continue;
          if (existentes.has(serie.toLowerCase())) {
            duplicadosNoGuardados.push(serie);
            continue;
          }
          // MAC es valores[1] cuando el modo es serie_mac o serie_mac_cm
          // CM MAC es valores[2] cuando el modo es serie_mac_cm
          const mac = pistoleoCampo === "serie_mac" || pistoleoCampo === "serie_mac_cm"
            ? (f.valores[1] ?? "").trim() || undefined
            : undefined;
          const cmMac = pistoleoCampo === "serie_mac_cm"
            ? (f.valores[2] ?? "").trim() || undefined
            : undefined;
          const modelo = f.modeloSeleccionado?.trim()
            || pistoleoModelo.trim()
            || detectarModeloPorPrefijo(serie)
            || "SIN MODELO";
          nuevos.push({
            id: uid(),
            serie,
            modelo,
            estado: pistoleoEstado,
            ubicacion: "Almacén HUB",
            mac,
            cmMac,
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
        set({ equipos: [...nuevos, ...get().equipos], pistoleoFilas: [] });
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

      addProduct: (sku, name, quantity, minStock, udm) => {
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

      deleteProduct: (id) =>
        set({ products: get().products.filter((p) => p.id !== id) }),

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
          const parts = line.trim().split("*");
          if (parts.length < 2) continue;
          const sku = parts[0].trim();
          const cantidad = parseInt(parts[1].trim(), 10);
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
        set({ entradas: get().entradas.filter((e) => e.id !== id) });
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
        set({ despachos: get().despachos.filter((x) => x.id !== id) });
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

      deleteEquipment: (id) =>
        set({ equipos: get().equipos.filter((e) => e.id !== id) }),

      deleteEquipmentBulk: (ids) =>
        set({ equipos: get().equipos.filter((e) => !ids.includes(e.id)) }),

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
      deleteNota: (id) => set({ notas: get().notas.filter((n) => n.id !== id) }),

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
      deleteHorarioItem: (id) =>
        set({ horario: get().horario.filter((h) => h.id !== id) }),
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
        return get().horario.filter(
          (h) => h.dia === diaHoy && h.horaInicio === ahoraStr && h.ultimoDisparo !== fechaISO
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
      deleteMiembro: (id) =>
        set({ miembros: get().miembros.filter((m) => m.id !== id) }),

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
          rows.push(["INVENTARIO LEMCORP", "", "", "", "", "", "", "", ""]);
          // Fila 2: subtítulo empresa
          rows.push([empresa.nombre || "Lemcorp", "", "", "", "", "", "", "", ""]);
          // Fila 3: vacía
          rows.push(Array(ncols).fill(""));
          // Fila 4-7: bloque info
          rows.push(["Exportado por:", usuario, "", "Fecha:", fechaStr, "", "Hora:", horaStr, ""]);
          rows.push(["Productos en catálogo:", productos.length, "", "Unidades totales:", totalUnidades.toLocaleString("es-PE"), "", "Productos en bajo stock:", bajoCount, ""]);
          rows.push(["Empresa:", empresa.nombre || "Lemcorp", "", "RUC:", empresa.ruc || "—", "", "Teléfono:", empresa.telefono || "—", ""]);
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
          XLSX.writeFile(wb, `Inventario_LEMCORP_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          ["MACA0B1C2D3F", "REPETIDOR ZXHN H3601P ZTE", "en_reparacion", "Taller"],
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
        pistoleoFilas: s.pistoleoFilas,
        pistoleoModeloSeleccionado: s.pistoleoModeloSeleccionado,
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
        // Migrar empresa: si era "LEMCORP" o vacío, cambiar a "Lemcorp"
        if (!p.empresa.nombre || p.empresa.nombre === "LEMCORP") {
          p.empresa = { ...DEFAULT_EMPRESA, ...p.empresa, nombre: "Lemcorp" };
        }
        // Mergear settings con defaults (para añadir campos nuevos)
        const mergedSettings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
        // Forzar tema oscuro en migración
        mergedSettings.tema = "oscuro";
        // Migrar usuario "Admin" → "Iker" (si era el default anterior)
        if (mergedSettings.usuario === "Admin" || !mergedSettings.usuario) {
          mergedSettings.usuario = "Iker";
        }
        p.settings = mergedSettings;
        if (!p.pistoleoCampo) p.pistoleoCampo = "serie";
        if (!p.pistoleoModelo) p.pistoleoModelo = "";
        if (!p.pistoleoEstado) p.pistoleoEstado = "disponible";
        // Normalizar products.quantity
        p.products = p.products.map((x: any) => ({
          ...x,
          quantity: typeof x.quantity === "number" ? x.quantity : 0,
        }));
        return p;
      },
      version: 11,
    }
  )
);
