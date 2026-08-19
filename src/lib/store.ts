// Store del sistema de control de almacén LEMCORP
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Product,
  Equipment,
  Entrada,
  Nota,
  Settings,
  EstadoEquipo,
  ActiveView,
} from "./types";
import { DEFAULT_SETTINGS, uid } from "./types";

interface StoreState {
  products: Product[];
  equipos: Equipment[];
  entradas: Entrada[];
  notas: Nota[];
  settings: Settings;
  activeView: ActiveView;

  // navegación
  setActiveView: (v: ActiveView) => void;

  // inventario (productos)
  addProduct: (sku: string, name: string, quantity: number, minStock?: number, udm?: string) => string | null;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  findProductBySku: (sku: string) => Product | null;

  // entradas (formato SKU*cantidad)
  registrarEntrada: (input: string) => { ok: boolean; msg: string; count: number };
  deleteEntrada: (id: string) => void;

  // equipos (series)
  addEquipment: (e: Omit<Equipment, "id" | "createdAt" | "updatedAt">) => string | null;
  updateEquipment: (id: string, data: Partial<Omit<Equipment, "id" | "createdAt">>) => void;
  deleteEquipment: (id: string) => void;
  findEquipmentBySerie: (serie: string) => Equipment | null;

  // bloc (notas)
  addNota: (texto: string) => void;
  togglePinNota: (id: string) => void;
  deleteNota: (id: string) => void;

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
      settings: { ...DEFAULT_SETTINGS },
      activeView: "dashboard",

      setActiveView: (v) => set({ activeView: v }),

      // ---------- Productos ----------
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

      updateProduct: (id, data) => {
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
          ),
        });
      },

      deleteProduct: (id) => {
        set({ products: get().products.filter((p) => p.id !== id) });
      },

      // ---------- Entradas (formato SKU*cantidad) ----------
      registrarEntrada: (input) => {
        const lines = input.split("\n").filter((l) => l.trim());
        let count = 0;
        const newEntradas: Entrada[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          // Formato: SKU*cantidad  (ej: 1066990*100)
          const parts = trimmed.split("*");
          if (parts.length < 2) continue;

          const sku = parts[0].trim();
          const cantidad = parseInt(parts[1].trim(), 10);
          if (!sku || isNaN(cantidad) || cantidad <= 0) continue;

          const product = get().findProductBySku(sku);
          const productName = product?.name ?? sku;

          // Sumar al stock del producto si existe
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
            producto: productName,
            cantidad,
          });
          count++;
        }

        if (count > 0) {
          set({ entradas: [...newEntradas, ...get().entradas] });
        }

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
        // Revertir el stock
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

      // ---------- Equipos (series) ----------
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

      updateEquipment: (id, data) => {
        set({
          equipos: get().equipos.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
          ),
        });
      },

      deleteEquipment: (id) => {
        set({ equipos: get().equipos.filter((e) => e.id !== id) });
      },

      // ---------- Bloc (notas) ----------
      addNota: (texto) => {
        const nota: Nota = {
          id: uid(),
          texto: texto.trim(),
          fecha: Date.now(),
          pinned: false,
        };
        set({ notas: [nota, ...get().notas] });
      },

      togglePinNota: (id) => {
        set({
          notas: get().notas.map((n) =>
            n.id === id ? { ...n, pinned: !n.pinned } : n
          ),
        });
      },

      deleteNota: (id) => {
        set({ notas: get().notas.filter((n) => n.id !== id) });
      },

      // ---------- Exportar ----------
      exportInventarioExcel: () => {
        import("xlsx").then((XLSX: any) => {
          const data = [
            ["INVENTARIO LEMCORP", "", "", "", ""],
            ["Exportado:", new Date().toLocaleString("es-PE"), "", "", ""],
            [],
            ["SKU", "PRODUCTO", "STOCK ACTUAL", "STOCK MÍNIMO", "UDM"],
            ...get().products.map((p) => [
              p.sku, p.name, p.quantity, p.minStock ?? "", p.udm ?? "",
            ]),
          ];
          const ws = XLSX.utils.aoa_to_sheet(data);
          ws["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
          XLSX.writeFile(wb, `Inventario_LEMCORP_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
      },

      // ---------- Config ----------
      setSetting: (key, value) => {
        set({ settings: { ...get().settings, [key]: value } });
      },

      clearAllData: () => {
        set({
          products: [],
          equipos: [],
          entradas: [],
          notas: [],
          settings: { ...DEFAULT_SETTINGS },
          activeView: "dashboard",
        });
      },

      seedDemoIfEmpty: () => {
        const { products, equipos, notas } = get();
        if (products.length > 0) return;

        const demoProducts: [string, string, number, number?, string?][] = [
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
        for (const [sku, name, qty, min, udm] of demoProducts) {
          get().addProduct(sku, name, qty, min, udm);
        }

        // Equipos demo si no hay
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
          for (const [serie, modelo, estado, ubi] of demoEq) {
            get().addEquipment({ serie, modelo, estado, ubicacion: ubi });
          }
        }

        // Notas demo si no hay
        if (notas.length === 0) {
          get().addNota("Traer 50 conectores FTTH para mañana - pedido urgente del técnico Pérez");
          get().addNota("Router con serie 48575443365E42D1 no enciende - llevar a taller");
          get().addNota("Verificar stock de cable RG-6, parece bajo");
        }
      },
    }),
    {
      name: "lemcorp-v2",
      partialize: (s) => ({
        products: s.products,
        equipos: s.equipos,
        entradas: s.entradas,
        notas: s.notas,
        settings: s.settings,
        activeView: s.activeView,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!Array.isArray(persisted.products)) persisted.products = [];
        if (!Array.isArray(persisted.equipos)) persisted.equipos = [];
        if (!Array.isArray(persisted.entradas)) persisted.entradas = [];
        if (!Array.isArray(persisted.notas)) persisted.notas = [];
        if (!persisted.settings) persisted.settings = { ...DEFAULT_SETTINGS };
        persisted.products = persisted.products.map((p: any) => ({
          ...p,
          quantity: typeof p.quantity === "number" ? p.quantity : 0,
        }));
        return persisted;
      },
      version: 1,
    }
  )
);
