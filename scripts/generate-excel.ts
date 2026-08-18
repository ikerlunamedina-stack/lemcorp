// Genera el Excel de LEMCORP con 3 hojas conectadas por fórmulas:
// 1. "Pegar Despacho del Día" — pegas despachos crudos
// 2. "Resumen por SKU" — suma automáticamente por SKU con SUMAR.SI
// 3. "Almacén" — stock base, columna para pegar el resumen, y stock actual

import * as XLSX from "xlsx";

// Catálogo de productos base (Producto, SKU, UdM, Stock Inicial)
const productos = [
  ["CONECTOR PLUG RJ-45", "1002900", "UNIDADES", 2768],
  ["ATADOR DE IDENTIFICACION DE ABONADO", "1002950", "UNIDADES", 1475],
  ["CABLE COAXIAL RG-6 AUTOSOPORTADO", "1003101", "METROS", 6794],
  ["CABLE COAXIAL BLANCO RG-6 S/MENSAJERO", "1004705", "METROS", 3121],
  ["CABLE UTP CAT5E FTP 4PR/24AWG", "1004692", "METROS", 15921],
  ["ROSETA ATB3101 SIN PIGTAIL", "1042681", "UNIDADES", 188],
  ["SUJETADOR DE TRAMO-CHAPA Q", "1004520", "UNIDADES", 1011],
  ["SUJETADOR DE ANCLAJE", "1004521", "UNIDADES", 1263],
  ["ROSETA TELEFONICA CON GEL", "1004529", "UNIDADES", 150],
  ["CABLE TELEF INTERIOR 2/22 AWG", "1004703", "UNIDADES", 17],
  ["MODEM ARRIS TG2482 24X8 3.0 S/BAT", "4048528", "UNIDADES", 12],
  ["ROUTER K562E-10 50087708 HUAWEI", "4073653", "UNIDADES", 16],
  ["REPETIDOR ZXHN H3601P 180000528400 ZTE", "4076224", "UNIDADES", 4],
  ["ROUTER ONT HG8145X6-13 50088770 HUAWEI", "4076358", "UNIDADES", 29],
  ["DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", "4072704", "UNIDADES", 67],
] as const;

// ===== Hoja 1: Pegar Despacho del Día =====
const despachoData: any[][] = [
  ["PEGAR DESPACHO DEL DÍA"],
  ["Pega aquí los despachos del día (uno por fila). El resumen se calcula solo en la hoja 'Resumen por SKU'."],
  [],
  ["FECHA", "SKU", "PRODUCTO", "CANTIDAD"],
  // Datos de ejemplo para probar
  ["2026-08-15", "1002900", "CONECTOR PLUG RJ-45", 10],
  ["2026-08-15", "1002900", "CONECTOR PLUG RJ-45", 5],
  ["2026-08-15", "1002950", "ATADOR DE IDENTIFICACION DE ABONADO", 20],
  ["2026-08-15", "1003101", "CABLE COAXIAL RG-6 AUTOSOPORTADO", 50],
  ["2026-08-15", "1004705", "CABLE COAXIAL BLANCO RG-6 S/MENSAJERO", 30],
  ["2026-08-15", "1002900", "CONECTOR PLUG RJ-45", 8],
  ["2026-08-15", "4076358", "ROUTER ONT HG8145X6-13 50088770 HUAWEI", 2],
];

// Pre-calcular totales por SKU a partir de los datos de ejemplo
// (para que el Excel abra con valores correctos, no solo fórmulas)
const totalesPorSku = new Map<string, number>();
for (let i = 4; i < despachoData.length; i++) {
  const row = despachoData[i];
  const sku = String(row[1] ?? "");
  const cant = Number(row[3] ?? 0);
  if (sku && !isNaN(cant)) {
    totalesPorSku.set(sku, (totalesPorSku.get(sku) ?? 0) + cant);
  }
}

// ===== Hoja 2: Resumen por SKU =====
const resumenData: any[][] = [
  ["RESUMEN POR SKU (automático)"],
  ["Esta hoja suma automáticamente todos los despachos del día por SKU. Copia la columna 'Total Despachado' y pégala en la hoja 'Almacén'."],
  [],
  ["SKU", "PRODUCTO", "TOTAL DESPACHADO HOY"],
];

productos.forEach((p, i) => {
  const sku = p[1];
  const producto = p[0];
  resumenData.push([sku, producto, 0]); // placeholder, luego reemplazamos con fórmula
});

const ws2 = XLSX.utils.aoa_to_sheet(resumenData);
ws2["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 20 }];

// Asignar fórmulas SUMAR.SI a la columna C (fila 5 en adelante)
// Los productos empiezan en almacenData[4] (0-indexed) = fila 5 (1-indexed).
productos.forEach((p, i) => {
  const row = i + 5; // fila Excel (1-indexed), productos empiezan en fila 5
  const formula = `SUMAR.SI('Pegar Despacho del Día'!$B$5:$B$1000,$A${row},'Pegar Despacho del Día'!$D$5:$D$1000)`;
  const cellRef = `C${row}`;
  const preVal = totalesPorSku.get(p[1]) ?? 0;
  ws2[cellRef] = { t: "n", f: formula, v: preVal };
});

// ===== Hoja 3: Almacén =====
const almacenData: any[][] = [
  ["ALMACÉN — CONTROL DE INVENTARIO"],
  ["Pega en la columna 'Despachado Hoy' los totales que copiaste de la hoja 'Resumen por SKU'. El 'Stock Actual' se calcula solo."],
  [],
  ["SKU", "PRODUCTO", "UDM", "STOCK INICIAL", "DESPACHADO HOY", "STOCK ACTUAL"],
];

productos.forEach((p, i) => {
  const sku = p[1];
  const producto = p[0];
  const udm = p[2];
  const stockInicial = p[3];
  almacenData.push([sku, producto, udm, stockInicial, 0, 0]); // placeholder
});

const ws3 = XLSX.utils.aoa_to_sheet(almacenData);
ws3["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];

// Asignar fórmulas Stock Actual = Stock Inicial - Despachado (columna F)
// Productos empiezan en fila 5 (1-indexed).
productos.forEach((p, i) => {
  const row = i + 5;
  const formula = `D${row}-E${row}`;
  const cellRef = `F${row}`;
  const stockInicial = p[3];
  const despachado = totalesPorSku.get(p[1]) ?? 0;
  const preVal = stockInicial - despachado;
  ws3[cellRef] = { t: "n", f: formula, v: preVal };
});

// ===== Crear el workbook =====
const wb = XLSX.utils.book_new();

const ws1 = XLSX.utils.aoa_to_sheet(despachoData);
ws1["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, ws1, "Pegar Despacho del Día");

XLSX.utils.book_append_sheet(wb, ws2, "Resumen por SKU");
XLSX.utils.book_append_sheet(wb, ws3, "Almacén");

XLSX.writeFile(wb, "/home/z/my-project/public/stock-lemcorp-inicial.xlsx");
console.log("Excel generado con 3 hojas:");
console.log("  1. Pegar Despacho del Día (datos crudos)");
console.log("  2. Resumen por SKU (fórmulas SUMAR.SI)");
console.log("  3. Almacén (Stock Actual = Stock Inicial - Despachado)");
console.log("Productos en catálogo:", productos.length);
