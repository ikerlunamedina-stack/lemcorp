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
  InfoEmpresa,
  MiembroEquipo,
  Nota,
  PistoleoCampo,
  Product,
  Rol,
  Settings,
} from "./types";
import {
  DEFAULT_EMPRESA,
  DEFAULT_SETTINGS,
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
  miembros: MiembroEquipo[];
  empresa: InfoEmpresa;
  settings: Settings;

  // UI / sesión
  activeView: ActiveView;

  // Pistoleo
  pistoleoCampo: PistoleoCampo;
  pistoleoModelo: string;
  pistoleoEstado: EstadoEquipo;
  pistoleoFilas: FilaPistoleo[];

  // ─── Acciones: navegación ───
  setActiveView: (v: ActiveView) => void;

  // ─── Acciones: pistoleo ───
  setPistoleoConfig: (patch: Partial<{
    pistoleoCampo: PistoleoCampo;
    pistoleoModelo: string;
    pistoleoEstado: EstadoEquipo;
  }>) => void;
  addPistoleoFila: (valores: string[]) => void;
  deletePistoleoFila: (id: string) => void;
  clearPistoleoFilas: () => void;
  confirmarPistoleo: () => { ok: boolean; msg: string; count: number };

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

  // ─── Acciones: empresa / miembros ───
  updateEmpresa: (data: Partial<InfoEmpresa>) => void;
  addMiembro: (nombre: string, rol: Rol, correo?: string, telefono?: string) => void;
  updateMiembro: (id: string, data: Partial<Omit<MiembroEquipo, "id">>) => void;
  deleteMiembro: (id: string) => void;

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
      miembros: [],
      empresa: { ...DEFAULT_EMPRESA },
      settings: { ...DEFAULT_SETTINGS },

      activeView: "dashboard",

      // pistoleo
      pistoleoCampo: "serie",
      pistoleoModelo: "",
      pistoleoEstado: "disponible",
      pistoleoFilas: [],

      // ─── Navegación ───
      setActiveView: (v) => set({ activeView: v }),

      // ─── Pistoleo ───
      setPistoleoConfig: (patch) => set({ ...patch }),
      addPistoleoFila: (valores) =>
        set({
          pistoleoFilas: [
            { id: uid(), valores: valores.map((v) => v.trim()), timestamp: Date.now() },
            ...get().pistoleoFilas,
          ],
        }),
      deletePistoleoFila: (id) =>
        set({ pistoleoFilas: get().pistoleoFilas.filter((f) => f.id !== id) }),
      clearPistoleoFilas: () => set({ pistoleoFilas: [] }),

      confirmarPistoleo: () => {
        const filas = get().pistoleoFilas;
        if (filas.length === 0) return { ok: false, msg: "No hay series para guardar.", count: 0 };
        const { pistoleoModelo, pistoleoEstado } = get();
        let count = 0;
        const nuevos: Equipment[] = [];
        const existentes = new Set(get().equipos.map((e) => e.serie.trim().toLowerCase()));
        const fechasNow = Date.now();
        for (const f of filas) {
          const serie = (f.valores[0] ?? "").trim();
          if (!serie) continue;
          if (existentes.has(serie.toLowerCase())) continue;
          const modelo = pistoleoModelo.trim() || detectarModeloPorPrefijo(serie) || "SIN MODELO";
          nuevos.push({
            id: uid(),
            serie,
            modelo,
            estado: pistoleoEstado,
            ubicacion: "Almacén HUB",
            createdAt: fechasNow,
            updatedAt: fechasNow,
          });
          existentes.add(serie.toLowerCase());
          count++;
        }
        if (count === 0) {
          return { ok: false, msg: "Todas las series ya estaban registradas.", count: 0 };
        }
        set({ equipos: [...nuevos, ...get().equipos], pistoleoFilas: [] });
        return {
          ok: true,
          msg: `${count} equipo(s) guardado(s) correctamente.`,
          count,
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
        import("xlsx").then((XLSX: any) => {
          const data: any[][] = [
            ["INVENTARIO LEMCORP", "", "", "", ""],
            ["Exportado:", new Date().toLocaleString("es-PE"), "", "", ""],
            [],
            ["SKU", "PRODUCTO", "STOCK ACTUAL", "STOCK MÍNIMO", "UDM"],
            ...get().products.map((p) => [p.sku, p.name, p.quantity, p.minStock ?? "", p.udm ?? ""]),
          ];
          const ws = XLSX.utils.aoa_to_sheet(data);
          ws["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
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
          miembros: [],
          empresa: { ...DEFAULT_EMPRESA },
          settings: { ...DEFAULT_SETTINGS },
          activeView: "dashboard",
          pistoleoFilas: [],
          pistoleoCampo: "serie",
          pistoleoModelo: "",
          pistoleoEstado: "disponible",
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
          miembros: [],
          pistoleoFilas: [],
        });

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
        get().addNota("Traer 50 conectores FTTH para mañana - pedido urgente del técnico Pérez");
        get().addNota("Router con serie 48575443365E42D1 no enciende - llevar a taller");
        get().addNota("Verificar stock de cable RG-6, parece bajo");

        // 6 miembros
        get().addMiembro("Antonio", "jefe_operaciones", "antonio@lemcorp.com", "999888777");
        get().addMiembro("Carlos Mendoza", "supervisor", "carlos@lemcorp.com", "999111222");
        get().addMiembro("J. Pérez", "tecnico", "jperez@lemcorp.com", "999333444");
        get().addMiembro("M. Luna", "tecnico", "mluna@lemcorp.com", "999555666");
        get().addMiembro("R. García", "tecnico", undefined, "999777888");
        get().addMiembro("L. Medina", "almacenero", "lmedina@lemcorp.com", undefined);
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
        miembros: s.miembros,
        empresa: s.empresa,
        settings: s.settings,
        activeView: s.activeView,
        pistoleoCampo: s.pistoleoCampo,
        pistoleoModelo: s.pistoleoModelo,
        pistoleoEstado: s.pistoleoEstado,
        pistoleoFilas: s.pistoleoFilas,
      }),
      migrate: (p: any) => {
        if (!p) return p;
        if (!Array.isArray(p.products)) p.products = [];
        if (!Array.isArray(p.equipos)) p.equipos = [];
        if (!Array.isArray(p.entradas)) p.entradas = [];
        if (!Array.isArray(p.despachos)) p.despachos = [];
        if (!Array.isArray(p.notas)) p.notas = [];
        if (!Array.isArray(p.miembros)) p.miembros = [];
        if (!Array.isArray(p.pistoleoFilas)) p.pistoleoFilas = [];
        if (!p.empresa) p.empresa = { ...DEFAULT_EMPRESA };
        // Mergear settings con defaults (para añadir campos nuevos)
        const mergedSettings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
        // Forzar tema oscuro en migración
        mergedSettings.tema = "oscuro";
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
      version: 8,
    }
  )
);
