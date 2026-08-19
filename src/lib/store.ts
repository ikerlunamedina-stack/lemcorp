// Store del sistema LEMCORP
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Product, Equipment, Entrada, Nota, Settings, EstadoEquipo,
  ActiveView, MiembroEquipo, Rol, InfoEmpresa,
} from "./types";
import { DEFAULT_SETTINGS, DEFAULT_EMPRESA, uid } from "./types";

interface StoreState {
  products: Product[];
  equipos: Equipment[];
  entradas: Entrada[];
  notas: Nota[];
  miembros: MiembroEquipo[];
  empresa: InfoEmpresa;
  settings: Settings;
  activeView: ActiveView;

  setActiveView: (v: ActiveView) => void;

  // inventario
  addProduct: (sku: string, name: string, quantity: number, minStock?: number, udm?: string) => string | null;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  findProductBySku: (sku: string) => Product | null;

  // entradas
  registrarEntrada: (input: string) => { ok: boolean; msg: string; count: number };
  deleteEntrada: (id: string) => void;

  // equipos
  addEquipment: (e: Omit<Equipment, "id" | "createdAt" | "updatedAt">) => string | null;
  updateEquipment: (id: string, data: Partial<Omit<Equipment, "id" | "createdAt">>) => void;
  deleteEquipment: (id: string) => void;
  findEquipmentBySerie: (serie: string) => Equipment | null;

  // bloc
  addNota: (texto: string) => void;
  togglePinNota: (id: string) => void;
  deleteNota: (id: string) => void;

  // empresa
  updateEmpresa: (data: Partial<InfoEmpresa>) => void;

  // miembros
  addMiembro: (nombre: string, rol: Rol, correo?: string, telefono?: string) => void;
  updateMiembro: (id: string, data: Partial<Omit<MiembroEquipo, "id">>) => void;
  deleteMiembro: (id: string) => void;

  // exportar
  exportInventarioExcel: () => void;

  // config
  setSetting: (key: keyof Settings, value: boolean) => void;
  clearAllData: () => void;
  seedDemoIfEmpty: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      equipos: [],
      entradas: [],
      notas: [],
      miembros: [],
      empresa: { ...DEFAULT_EMPRESA },
      settings: { ...DEFAULT_SETTINGS },
      activeView: "dashboard",

      setActiveView: (v) => set({ activeView: v }),

      findProductBySku: (sku) => {
        const norm = sku.trim().toLowerCase();
        return get().products.find((p) => p.sku.trim().toLowerCase() === norm) ?? null;
      },

      addProduct: (sku, name, quantity, minStock, udm) => {
        const skuTrim = sku.trim();
        if (!skuTrim || !name.trim()) return null;
        if (get().findProductBySku(skuTrim)) return null;
        const p: Product = { id: uid(), sku: skuTrim, name: name.trim(), quantity: quantity || 0, minStock, udm, createdAt: Date.now(), updatedAt: Date.now() };
        set({ products: [...get().products, p] });
        return p.id;
      },

      updateProduct: (id, data) => {
        set({ products: get().products.map((p) => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p) });
      },

      deleteProduct: (id) => set({ products: get().products.filter((p) => p.id !== id) }),

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
            set({ products: get().products.map((p) => p.id === product.id ? { ...p, quantity: p.quantity + cantidad, updatedAt: Date.now() } : p) });
          }
          newEntradas.push({ id: uid(), fecha: Date.now(), sku, producto: product?.name ?? sku, cantidad });
          count++;
        }
        if (count > 0) set({ entradas: [...newEntradas, ...get().entradas] });
        return { ok: count > 0, msg: count > 0 ? `${count} entrada(s) registrada(s)` : "Formato incorrecto. Usa: SKU*cantidad (ej: 1066990*100)", count };
      },

      deleteEntrada: (id) => {
        const ent = get().entradas.find((e) => e.id === id);
        if (!ent) return;
        const product = get().findProductBySku(ent.sku);
        if (product) set({ products: get().products.map((p) => p.id === product.id ? { ...p, quantity: Math.max(0, p.quantity - ent.cantidad), updatedAt: Date.now() } : p) });
        set({ entradas: get().entradas.filter((e) => e.id !== id) });
      },

      findEquipmentBySerie: (serie) => {
        const norm = serie.trim().toLowerCase();
        return get().equipos.find((e) => e.serie.trim().toLowerCase() === norm) ?? null;
      },

      addEquipment: (e) => {
        const serieTrim = e.serie.trim();
        const modeloTrim = e.modelo.trim();
        if (!serieTrim || !modeloTrim) return null;
        if (get().findEquipmentBySerie(serieTrim)) return null;
        const eq: Equipment = { id: uid(), ...e, serie: serieTrim, modelo: modeloTrim, createdAt: Date.now(), updatedAt: Date.now() };
        set({ equipos: [eq, ...get().equipos] });
        return eq.id;
      },

      updateEquipment: (id, data) => set({ equipos: get().equipos.map((e) => e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e) }),
      deleteEquipment: (id) => set({ equipos: get().equipos.filter((e) => e.id !== id) }),

      addNota: (texto) => set({ notas: [{ id: uid(), texto: texto.trim(), fecha: Date.now(), pinned: false }, ...get().notas] }),
      togglePinNota: (id) => set({ notas: get().notas.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n) }),
      deleteNota: (id) => set({ notas: get().notas.filter((n) => n.id !== id) }),

      updateEmpresa: (data) => set({ empresa: { ...get().empresa, ...data } }),

      addMiembro: (nombre, rol, correo, telefono) => set({ miembros: [...get().miembros, { id: uid(), nombre: nombre.trim(), rol, correo: correo?.trim() || undefined, telefono: telefono?.trim() || undefined, activo: true }] }),
      updateMiembro: (id, data) => set({ miembros: get().miembros.map((m) => m.id === id ? { ...m, ...data } : m) }),
      deleteMiembro: (id) => set({ miembros: get().miembros.filter((m) => m.id !== id) }),

      exportInventarioExcel: () => {
        import("xlsx").then((XLSX: any) => {
          const data = [
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

      setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),

      clearAllData: () => set({
        products: [], equipos: [], entradas: [], notas: [], miembros: [],
        empresa: { ...DEFAULT_EMPRESA }, settings: { ...DEFAULT_SETTINGS }, activeView: "dashboard",
      }),

      seedDemoIfEmpty: () => {
        const { products, equipos, notas, miembros } = get();
        if (products.length > 0) return;

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
          ["4072704", "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", 67, 5, "UNIDADES"],
        ];
        for (const [sku, name, qty, min, udm] of demo) get().addProduct(sku, name, qty, min, udm);

        if (equipos.length === 0) {
          const demoEq: [string, string, EstadoEquipo, string?][] = [
            ["48575443365E42B7", "ROUTER ONT HG8145X6-13 HUAWEI", "disponible", "Almacén HUB"],
            ["48575443365E42C8", "ROUTER ONT HG8145X6-13 HUAWEI", "disponible", "Almacén HUB"],
            ["48575443365E42D1", "ROUTER ONT HG8145X6-13 HUAWEI", "averiado", "Taller"],
            ["SN10002ABC", "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", "disponible", "Almacén HUB"],
            ["SN10003DEF", "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", "en_retiro", "Taller"],
            ["MACA0B1C2D3E", "REPETIDOR ZXHN H3601P ZTE", "disponible", "Almacén HUB"],
            ["MACA0B1C2D3F", "REPETIDOR ZXHN H3601P ZTE", "en_reparacion", "Taller"],
          ];
          for (const [serie, modelo, estado, ubi] of demoEq) get().addEquipment({ serie, modelo, estado, ubicacion: ubi });
        }

        if (notas.length === 0) {
          get().addNota("Traer 50 conectores FTTH para mañana - pedido urgente del técnico Pérez");
          get().addNota("Router con serie 48575443365E42D1 no enciende - llevar a taller");
          get().addNota("Verificar stock de cable RG-6, parece bajo");
        }

        if (miembros.length === 0) {
          get().addMiembro("Antonio", "jefe_operaciones", "antonio@lemcorp.com", "999888777");
          get().addMiembro("Carlos Mendoza", "supervisor", "carlos@lemcorp.com", "999111222");
          get().addMiembro("J. Pérez", "tecnico", "jperez@lemcorp.com", "999333444");
          get().addMiembro("M. Luna", "tecnico", "mluna@lemcorp.com", "999555666");
          get().addMiembro("R. García", "tecnico", undefined, "999777888");
          get().addMiembro("L. Medina", "almacenero", "lmedina@lemcorp.com", undefined);
        }
      },
    }),
    {
      name: "lemcorp-v2",
      partialize: (s) => ({
        products: s.products, equipos: s.equipos, entradas: s.entradas,
        notas: s.notas, miembros: s.miembros, empresa: s.empresa,
        settings: s.settings, activeView: s.activeView,
      }),
      migrate: (p: any) => {
        if (!p) return p;
        if (!Array.isArray(p.products)) p.products = [];
        if (!Array.isArray(p.equipos)) p.equipos = [];
        if (!Array.isArray(p.entradas)) p.entradas = [];
        if (!Array.isArray(p.notas)) p.notas = [];
        if (!Array.isArray(p.miembros)) p.miembros = [];
        if (!p.empresa) p.empresa = { ...DEFAULT_EMPRESA };
        if (!p.settings) p.settings = { ...DEFAULT_SETTINGS };
        p.products = p.products.map((x: any) => ({ ...x, quantity: typeof x.quantity === "number" ? x.quantity : 0 }));
        return p;
      },
      version: 2,
    }
  )
);
