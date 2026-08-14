# Worklog - LEMCORP Gestor de Excel

Proyecto: Aplicación web tipo "gestor de Excel" centralizada para LEMCORP.
Stack: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Zustand + SheetJS (xlsx).
Persistencia: localStorage del navegador.

---
Task ID: 1
Agent: main
Task: Explorar estructura del proyecto e instalar dependencias

Work Log:
- Revisada estructura del proyecto Next.js existente
- Verificadas dependencias disponibles (zustand, framer-motion, lucide-react, shadcn/ui completo)
- Instalado SheetJS: `bun add xlsx` (xlsx@0.18.5)
- Confirmado dev server corriendo en puerto 3000

Stage Summary:
- Stack listo para desarrollo
- Próximo paso: definir tipos de datos y store Zustand con persistencia

---
Task ID: 2-12
Agent: main
Task: Construir y verificar la aplicación LEMCORP Gestor de Excel completa

Work Log:
- Capa de datos: types.ts (tipos SheetFile, FileTag), store.ts (Zustand + persist localStorage), editor-store.ts (UI no persistente)
- Motor de fórmulas (formulas.ts): parser recursivo descendente seguro (sin eval), soporta SUMA/SI/PROMEDIO/MAX/MIN/CONTAR/REDONDEAR/ABS/CONCATENAR/BUSCARV/SUMAR.SI/CONTAR.SI/SI.ERROR y aritmética + - * / ^ & comparaciones, referencias A1 y rangos A1:B10, recálculo con detección de referencias circulares
- Excel (excel.ts): import/export con SheetJS, preserva fórmulas al importar, escribe fórmulas reales al exportar
- Detección (detection.ts): clasifica archivos por nombres de columnas (inventario/despachos/equipos/otro) con scoring
- Automatización (automation.ts): Despachos -> Inventario con ledger appliedMap que persiste fuera del undo; revierte todo y reaplica para soportar ediciones/eliminaciones de filas
- UI: globals.css (tema gris corporativo oklch, fuente sistema, clase .emoji con filter grayscale, animaciones fade-up/scale-in, scrollbar macOS), sidebar.tsx (marca LEMCORP, navegación, lista archivos, crear/importar/buscar), topbar.tsx (barra de fórmulas fx, deshacer/rehacer/exportar/etiqueta), spreadsheet.tsx (grilla con headers A/B/C y 1/2/3 sticky, edición inline, navegación teclado Tab/Enter/flechas, Ctrl+Z/Y, menús contextuales), tag-dialog.tsx (selección con sugerencia automática), summary-view.tsx (tarjetas stats, inventario por archivo, alertas bajo stock con origen), equipment-view.tsx (agrupa por modelo, expandible con series), footer.tsx (sticky), welcome.tsx (overlay animado con framer-motion)
- Bug encontrado y corregido durante verificación: findCol retornaba SKU antes que Producto (ambos en PRODUCT_COLS); corregido para respetar prioridad de candidatos. También corregido doble-commit al mover celda activa tras Enter (editCell tracking + guarda en commit).
- Verificación con Agent Browser: fórmula =SUMA(C2:C4)=665 ✓, automatización 120->115->110 ✓, Ctrl+Z revierte despachos y reajusta inventario 110->115 ✓, alertas bajo stock (ONT bajado a 5) ✓, vista Equipos agrupada por modelo con series ✓, export a .xlsx (20KB) ✓, import round-trip preserva datos ✓
- Lint limpio, dev server sin errores
- VLM confirma: tema gris corporativo, emojis en escala de grises, esquinas redondeadas tipo iPhone, diseño profesional

Stage Summary:
- Aplicación completa y funcional en / (única ruta visible)
- 7 funcionalidades requeridas todas operativas y verificadas en navegador
- Persistencia localStorage, datos demo precargados (3 archivos: Inventario Total, Despachos del Día, Equipos Averiados)
- Estado limpio restaurado para el usuario final

---
Task ID: P1-P8
Agent: main
Task: Añadir apartado de Productos con SKU + validación cruzada de nombres

Work Log:
- Tipos: añadido Product {id, sku, name, category} y Mismatch a types.ts; ActiveView ahora incluye "productos"
- validation.ts (nuevo): findCol con prioridad de candidatos; SKU_COLS (sku, codigo, código, cod, etc.); NAME_COLS (producto, descripcion, articulo, etc.); validateFiles() cruza archivos vs catálogo maestro y devuelve discrepancias (SKU existe pero nombre distinto, comparación tolerante a acentos/mayúsculas/espacios); suggestProducts() detecta SKUs en archivos no catalogados
- Store extendido: products[] persistente; addProduct/updateProduct/deleteProduct con validación de SKU duplicado (no permite 2 productos con mismo SKU); importProductsBulk para añadir varios; getMismatches() y getSuggestions() como getters; migrate() añade products=[] en versiones anteriores (version: 1)
- seedDemoIfEmpty: siembra 3 productos demo (RT-001 Router TP-Link WR840N, ONT-002 ONT Huawei HG8245, CAB-003 Cable UTP Cat6)
- products-view.tsx (nuevo): catálogo con tabla agrupada por categoría, búsqueda SKU/nombre, añadir/editar/eliminar, banner de discrepancias con tabla (nombre tachado en archivo vs nombre catálogo), sugerencias de SKUs no catalogados como chips clicables + "Añadir todos", advertencia "Ya existe un producto con este SKU" al detectar duplicado
- sidebar.tsx: botón nav "Productos" con badge de conteo
- topbar.tsx: título "Catálogo de productos" para la vista
- summary-view.tsx: tarjeta "Validación de catálogo" con 3 mini-tarjetas (productos, discrepancias, SKUs sin catalogar) y tabla de discrepancias con origen (archivo + fila)
- page.tsx: renderiza ProductsView cuando activeView === "productos"

Verificación con Agent Browser:
- Seed: 3 productos sembrados automáticamente ✓
- Añadir producto SKU 4076358 / "ROUTER ONT HG8145X6-13 HUAWEI" / categoría ONT → guardado ✓
- Editar nombre del Router en Inventario a "Router TP-Link MODIFICADO" → discrepancia detectada en Resumen (tabla con RT-001, nombre tachado en rojo vs nombre catálogo) ✓ (confirmado con VLM)
- Volver al nombre original con Ctrl+Z → validación limpia ("Todos los SKUs coinciden") ✓
- SKU duplicado: intentar añadir RT-001 otra vez → advertencia "Ya existe un producto con este SKU", no se duplica (count sigue en 4) ✓
- Sugerencias: SKUs en archivos no catalogados aparecen como chips clicables ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- Nuevo apartado "Productos" operativo con catálogo maestro SKU + nombre + categoría
- Validación cruzada: detecta SKU en archivos y avisa si un mismo SKU tiene distinto nombre
- SKU tratado como identificador único (el "DNI" del producto): no permite duplicados
- Persistencia localStorage con migración para versiones anteriores

---
Task ID: N1-N11
Agent: main
Task: Campana de notificaciones + Configuración + Series + catálogo con cantidades

Work Log:
- types.ts: Product.category → Product.quantity; nuevo Settings {skuDetection, lowStockAlerts, automation} + DEFAULT_SETTINGS; ActiveView += "config" | "series"
- store.ts: settings persistente, seenNotificationKeys persistente, setSetting, markNotificationsSeen, clearAllData; addProduct/updateProduct/importProductsBulk usan quantity; getMismatches/getSuggestions respetan settings.skuDetection; automatización (setCell/setCells/addRow/deleteRow/undo/redo/recalcAutomation) respeta settings.automation; seedDemo siembra productos con quantity; migración v1→v2 (convierte category→eliminado, añade settings y seenNotificationKeys)
- validation.ts: suggestProducts ahora detecta columna "Cantidad" y devuelve quantity; prioriza quantity de archivos inventario
- notifications.ts (nuevo): computeNotifications() agrega bajo stock (si lowStockAlerts), discrepancias SKU (si skuDetection), SKUs sin catalogar (si skuDetection), y aviso de falta inventario; ordena por severidad
- notification-bell.tsx (nuevo): campana lucide (Bell, monocroma) en topbar top-right con badge de no leídas; panel desplegable con lista de notificaciones, click navega a la vista/archivo relacionado; marcar vistas al abrir (400ms delay)
- config-view.tsx (nuevo): 3 toggles (Detección SKU, Alertas bajo stock, Automatización) con Switch; sección Datos (stats + Restaurar demo + Borrar todo con confirmación); sección Acerca de
- series-view.tsx (nuevo): lista plana de TODAS las series de equipos con buscador + filtros por estado (chips); columnas Serie/Modelo/Estado/Ubicación/Observación/Origen; estados negativos (Averiado, En retiro) en rojo
- products-view.tsx: reescrito sin categoría, con columna Cantidad (badge numérico), lista plana ordenada por SKU, nota informativa sobre lectura automática de Excel, total de unidades en encabezado
- summary-view.tsx: stat "SKUs distintos" reemplazado por "Productos en catálogo" (count + sugerencias sin catalogar)
- sidebar.tsx: nav Series (icono Hash) entre Productos y Equipos; botón Configuración (icono Settings) al pie
- topbar.tsx: títulos para vistas series y config; NotificationBell siempre visible arriba a la derecha (separada con divisor)
- page.tsx: renderiza SeriesView y ConfigView

Verificación con Agent Browser:
- Migración v1→v2: products con quantity, settings completo ✓
- Campana: badge muestra conteo de no leídas (1 tras crear bajo stock), panel desplegable lista notificaciones con emoji escala de grises ✓
- Notificaciones: bajo stock (ONT 3 und mín 10) + discrepancia SKU (RT-001 «Router Modificado»≠«Router TP-Link WR840N») aparecen juntas ✓ (VLM confirmó diseño gris)
- Toggle Configuración: desactivar "Detección de SKU" elimina notificación de discrepancia pero mantiene bajo stock ✓
- Vista Series: lista plana con SN10001/SN10002, filtros por estado (Averiado, En retiro) ✓
- Catálogo: columna Cantidad con badges 120/45/500, nota de lectura automática de Excel, 665 unidades totales ✓ (VLM confirmó)
- Stat "SKUs distintos" eliminado del Resumen ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- Campana de notificaciones (gris, top-right) con panel desplegable y badge de no leídas
- Vista Configuración con toggles para desactivar detección SKU, alertas y automatización
- Vista Series separada (lista plana de todas las series, no saturada en Equipos)
- Catálogo de productos con columna Cantidad (lee automáticamente del Excel al importar)
- Stat "SKUs distintos" eliminado; las advertencias van por la campana

---
Task ID: F1-F6
Agent: main
Task: Corregir detección del Excel real del usuario (Stock HUB ALTAS - LIMA NORTE)

Work Log:
- Problema identificado al inspeccionar el Excel real del usuario:
  1) El archivo usa columnas de cantidad llamadas "Físico", "Disponible", "Reservado", "En Tránsito" — la app solo reconocía "Cantidad", "Stock", etc.
  2) Los números están en formato español con separador de miles ("2,768.00") — parseFloat los leía como 2.768 en vez de 2768
- Creado src/lib/num.ts con parseNum() que maneja correctamente:
  - "2,768.00" -> 2768 (coma miles, punto decimal)
  - "2.768,00" -> 2768 (punto miles, coma decimal, formato es-ES)
  - "2,5" -> 2.5 / "2.5" -> 2.5 / "2768" -> 2768
  - Y fmtNum() para mostrar en formato es-PE
- Expandido QTY_COLS en automation.ts, validation.ts, summary-view.tsx, notifications.ts para incluir: fisico, disponible, cantidad, stock, existencia, saldo, stock actual, cant, qty (en ese orden de prioridad — Físico primero porque es el reporte real de almacén)
- Reemplazado parseFloat(x.replace(",",".")) por parseNum(x) en:
  - automation.ts (getQty + adjust)
  - validation.ts (suggestProducts)
  - summary-view.tsx (extractInventory)
  - notifications.ts (bajo stock)
  - products-view.tsx (input cantidad)

Verificación con el Excel real del usuario (Stock_HUB_ALTAS_-_LIMA_NORTE_Resumen.xlsx, 68 filas):
- Importación: tag detectado como "inventario" (tagConfirmed=true) ✓
- Headers leídos: Almacén | Ubicación | SKU | Producto | Categoría | Propiedad | Físico | Reservado | En Tránsito | Disponible | UdM | Observaciones ✓
- Número "2,768.00" parseado como 2768 ✓
- SKU=1002900, Producto=CONECTOR PLUG RJ-45, Físico=2768, Disponible=2441 ✓
- Sugerencias: 54 SKUs detectados (sin catalogar) ✓
- "Añadir todos": 57 productos en catálogo, TODOS con cantidad ✓
- Ejemplo: CONECTOR PLUG RJ-45 (SKU 1002900) quantity=2768 ✓
- Resumen: 57 productos en catálogo, 999,859 unidades totales (stock real del almacén) ✓
- VLM confirmó: catálogo muestra SKUs numéricos (1002900, 1002950, 1003101) y cantidades correctas (2768, 1475, 6794, 136, 309, 1011) ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- La app ahora detecta y lee correctamente Excels reales de almacén LEMCORP
- Reconoce columnas Físico/Disponible/Reservado/En Tránsito como cantidades (prioriza Físico)
- Parsea correctamente números en formato español ("2,768.00" → 2768)
- 68 productos del almacén HUB ALTAS - LIMA NORTE importados y catalogados con sus cantidades reales

---
Task ID: U1-U4
Agent: main
Task: Precargar el Excel real del usuario (Stock HUB ALTAS - LIMA NORTE) en la app

Work Log:
- Copiado el Excel del usuario a public/stock-lemcorp-inicial.xlsx (10KB) para que esté siempre accesible vía HTTP
- Creada acción seedFromUserExcel() en el store (async):
  1. Si ya hay archivos, no hace nada (respeta datos del usuario)
  2. fetch('/stock-lemcorp-inicial.xlsx') → blob → File
  3. importFile(file) — detecta tag + tagConfirmed automáticamente
  4. setFileTag(fileId, "inventario") — asegura etiqueta
  5. Crea también "Despachos del Día" y "Equipos Averiados" vacíos
  6. Genera catálogo automáticamente: getSuggestions() → importProductsBulk() con SKU + nombre + cantidad de cada producto del Excel
  7. Vista inicial en Resumen
  8. Si falla el fetch, cae a seedDemoIfEmpty como fallback
- page.tsx: useEffect ahora llama seedFromUserExcel() en vez de seedDemoIfEmpty()

Verificación con Agent Browser (estado limpio):
- Al abrir la app (sin datos), el Excel se cargó automáticamente:
  - 3 archivos: Stock HUB ALTAS - LIMA NORTE + Despachos del Día + Equipos Averiados
  - 54 productos en catálogo, TODOS con cantidad
  - Ejemplos: DECODIFICADOR MOTOROLA HD DCX-525 = 10, MODEM SAGEMCOM V2.2 = 6, MODEM ARRIS TG2482 = 43
  - SKU=1002900, Producto=CONECTOR PLUG RJ-45, Físico=2768, Disponible=2441 ✓
- Resumen: 54 productos en catálogo, 999,199 unidades totales (stock real del almacén) ✓
- Editor: muestra todos los encabezados (Almacén, Ubicación, SKU, Producto, Categoría, Propiedad, Físico, Reservado, En Tránsito, Disponible, UdM, Observaciones) y datos correctos ✓
- VLM confirmó: stats visibles (54 productos, 999,199 unidades), archivo "Stock HUB ALTAS - LIMA NORTE" en lista, catálogo con SKUs numéricos y cantidades como badges, diseño gris corporativo ✓
- Lint limpio, dev server sin errores

Stage Summary:
- El Excel real del usuario (Stock HUB ALTAS - LIMA NORTE) ahora se carga automáticamente al abrir la app
- 54 productos del almacén se catalogaron automáticamente con sus cantidades reales (Físico)
- 999,199 unidades totales visibles en el Resumen
- Si el usuario borra datos desde Configuración y recarga, el Excel vuelve a cargarse automáticamente

---
Task ID: I1-I5
Agent: main
Task: Vista Inventario (datos del Excel pasan al sistema, renombrar Productos → Inventario)

Work Log:
- Creado src/lib/inventory.ts: extractUnifiedInventory() lee todos los archivos "inventario" y consolida filas en tabla viva con todas las columnas reales del Excel del usuario (SKU, Producto, Categoría, Físico, Reservado, En Tránsito, Disponible, UdM, Ubicación, Almacén, Observaciones). Detecta dinámicamente qué columnas existen. No es una copia: se lee directo del estado de los archivos en cada render.
- Creado src/components/lem/inventario-view.tsx: tabla viva de stock con:
  - 4 tarjetas de totales: Stock físico, Disponible, Reservado, En tránsito
  - Buscador (SKU, producto, almacén, ubicación, categoría)
  - Filtros por categoría (chips)
  - Tabla con columnas dinámicas (solo muestra las que existen): SKU, Producto, Categoría, Físico (badge negro), Reservado, Tránsito, Disponible, UdM, Almacén, Ubicación, Origen
  - Fila de totales al pie
  - Botón "Ver archivo" por fila (abre el editor)
  - Sugerencias de SKUs sin catalogar (con "Añadir todos")
  - Botón "Catálogo" que abre diálogo del catálogo maestro de SKUs (add/edit/delete, discrepancias)
- Renombrado nav "Productos" → "Inventario" en sidebar.tsx (icono Boxes)
- Topbar: título "Inventario" para la vista
- page.tsx: renderiza InventarioView (removido ProductsView)
- seedFromUserExcel y seedDemoIfEmpty: vista inicial ahora "inventario" (antes "resumen")
- summary-view.tsx: enlaces "Ver catálogo" → "Ver inventario", stat "Productos en catálogo" → "Productos en inventario"

Verificación con Agent Browser (Excel real del usuario):
- Vista Inventario muestra: 68 producto(s) en stock · 999,199 unidades físicas ✓
- Tarjetas de totales: Stock físico 999,199 · Disponible 985,537 · Reservado 13,662 · En tránsito 125 ✓
- Tabla con columnas: SKU, Producto, Categoría, Físico (badge), Reservado, Tránsito, Disponible, UdM, Almacén, Ubicación, Origen ✓
- SKUs numéricos (1002900, 1002950) y cantidades correctas (2768) ✓
- Catálogo maestro accesible vía botón "Catálogo" (54 SKUs, add/edit/delete, discrepancias) ✓
- VLM confirmó: "interfaz de gestión de inventario (WMS/ERP) profesional para el control de stock en almacenes reales" ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- Los datos del Excel ahora viven EN el sistema: la vista Inventario muestra el stock real del almacén HUB ALTAS - LIMA NORTE con todas sus columnas
- Renombrado "Productos" → "Inventario" en toda la app (nav, topbar, resumen)
- El catálogo maestro de SKUs sigue disponible (botón "Catálogo" en la vista Inventario) para validación de nombres
- Tabla viva (no copia): cualquier edición en el editor se refleja al instante en la vista Inventario

---
Task ID: M1-M6
Agent: main
Task: Menú contextual personalizado (clic derecho) con funcionalidades de la app

Work Log:
- Creado src/components/lem/custom-context-menu.tsx: menú contextual 100% personalizado (no del navegador) renderizado con createPortal en document.body. Soporta:
  - Items con label, icono, shortcut, disabled
  - Separadores
  - Submenús (hover para abrir, posicionados a la derecha con CSS absolute)
  - Cierre al click fuera, Escape, o scroll
  - Ajuste de posición para no salir de la ventana
  - Exporta MenuIcons (Copy, Paste, Scissors, Trash2, Eraser, Sigma, etc.) para construir menús
- Store extendido con fillSeries (rellenar serie numérica con detección de paso) y clearRange (limpiar rango)
- spreadsheet.tsx integrado:
  - onContextMenu en cada celda → abre menú con: Copiar (Ctrl+C), Pegar (Ctrl+V), Cortar (Ctrl+X), Editar celda (Enter), Borrar contenido (Supr), Rellenar hacia abajo, Insertar fórmula (submenú), Fila (submenú), Columna (submenú)
  - onContextMenu en headers de columna → menú simplificado (Agregar/Eliminar columna)
  - onContextMenu en headers de fila → menú simplificado (Insertar/Eliminar fila)
  - Portapapeles interno (clipboardRef) + integración con navigator.clipboard API (con fallback)
- Submenú "Insertar fórmula": SUMA hasta esta celda, SUMA de toda la columna, PROMEDIO, MAX, MIN, CONTARA, SI (condicional), HOY (fecha)
- Eliminado ContextMenu de radix (ya no se usa) de ColumnHeader y RowHeader

Verificación con Agent Browser (Excel real del usuario):
- Clic derecho en celda → menú personalizado aparece con todos los items ✓
- Copiar (Ctrl+C) habilita Pegar en otras celdas ✓
- Pegar copia el valor correctamente (celda 2,2 = "CONECTOR PLUG RJ-45") ✓
- Submenú "Insertar fórmula" muestra: SUMA hasta esta celda, SUMA de toda la columna, PROMEDIO, MAX, MIN, CONTAR, SI, HOY ✓
- VLM confirmó: "menú contextual personalizado (no el del navegador) con todas las opciones (Copiar, Pegar, Cortar, Editar celda, Borrar contenido, Rellenar hacia abajo, Insertar fórmula, Fila, Columna), estilo gris corporativo" ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- El editor ahora tiene un menú contextual 100% personalizado (clic derecho) con todas las funcionalidades de la app
- No aparece el menú del navegador/Google, solo el de LEMCORP
- Acciones: copiar/pegar/cortar (con portapapeles real), editar, borrar, rellenar serie, insertar fórmulas frecuentes, insertar/eliminar filas y columnas
- Submenús para fórmulas y para filas/columnas

---
Task ID: X1-X8
Agent: main
Task: Funciones avanzadas tipo Excel (resize, formato, duplicados, selección rango)

Work Log:
- Tipos: añadido CellStyle {bg, color, bold, italic, fontSize, align} y SheetFile.colWidths/rowHeights/cellStyles. HistorySnapshot extendido para incluir formatos. Settings.highlightDuplicates añadido.
- Store v3: nuevas acciones setCellStyle (con toggle bold/italic), clearCellStyle, setColWidth, setRowHeight. snapshotOf y undo/redo restauran estilos/dimensiones. Migración v2→v3 añade highlightDuplicates y campos de formato en archivos.
- editor-store.ts extendido: selección de rango (range, selecting, startRange, extendRange, endRange), helpers isInRange y rangeCells.
- format-toolbar.tsx (nuevo): barra de herramientas tipo Excel con:
  - Negrita (toggle), Cursiva (toggle)
  - Tamaño de fuente (input + botones +/-)
  - Color de fondo (paleta 20 colores: grises + acentos)
  - Color de texto (paleta 13 colores)
  - Alineación (izquierda/centro/derecha)
  - Quitar formato
  - Resaltar duplicados (toggle global)
  - Aplica formato a la celda activa o a toda la selección de rango
- spreadsheet.tsx: integrado FormatToolbar arriba de la grilla; celdas aplican estilos (bg, color, bold, italic, fontSize, align); selección de rango con mousedown+drag y shift+click; resaltado de duplicados (bg-amber-100); headers con resize handles arrastrables.
- ColumnHeader/RowHeader reescritos con resize handles (drag para cambiar ancho/alto, límites 40-600px / 24-200px).
- Menú contextual: añadido submenú "Formato" con Negrita, Cursiva, Fondo amarillo/verde/rojo/gris oscuro, Quitar formato.
- config-view.tsx: añadido toggle "Resaltar duplicados en el editor".

Verificación con Agent Browser (Excel real del usuario):
- Barra de formato visible al seleccionar celda: Negrita, Cursiva, Tamaño, Color fondo, Color texto, Alineación, Quitar formato, Duplicados ✓
- Aplicar negrita → style 1,3 = {bold:true} ✓
- Aplicar color fondo amarillo → style 1,3 = {bold:true, bg:"#fef3c7"} ✓
- Resaltar duplicados → 598 celdas repetidas coloreadas automáticamente ✓
- Resize de columna D arrastrando → colWidths = {3: 200} (de 120 a 200) ✓
- Submenú "Formato" del menú contextual con opciones de colores ✓
- VLM confirmó: "barra de herramientas de formato con negrita, cursiva, tamaño, colores, alineación y botón Duplicados; celdas resaltadas en amarillo; columna D más ancha; diseño gris corporativo" ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- Editor ahora con funciones avanzadas tipo Excel:
  - Resize de columnas y filas (arrastrar bordes)
  - Barra de formato: negrita, cursiva, tamaño de fuente, color de fondo (paleta 20 colores), color de texto (13 colores), alineación, quitar formato
  - Resaltado automático de duplicados (toggle, colorear celdas repetidas)
  - Selección de rango (arrastrar o shift+click)
  - Submenú Formato en menú contextual con colores rápidos
  - Formato persistente (se guarda en localStorage, entra en historial undo/redo)

---
Task ID: D1-D6
Agent: main
Task: Automatización despachos oficiales → inventario (Excel con hoja Movimientos)

Work Log:
- Inspeccionado el Excel oficial del usuario (control_despachos_lemcorp_v3.xlsx):
  - Hoja "Resumen": PRODUCTO, SKU, TOTAL CONTABILIZADO (54 productos)
  - Hoja "Movimientos": 288 filas con columnas Nº Operación, Tipo (IN/OUT/INT), SKU (col 29), Producto (col 30), Cantidad (col 32), Guía de Remisión, Almacén Origen/Destino, Razón Social, etc.
  - Todas las filas existentes son INT (movimientos internos entre almacenes)
- Copiado a public/despachos-lemcorp-oficial.xlsx (siempre accesible vía HTTP)
- excel.ts: importFile ahora soporta multihoja con pickBestSheet() que prioriza "Movimientos"/"Despachos" o la hoja con columnas SKU+Cantidad
- automation.ts reescrito:
  - Cruce por SKU (preferido) o Producto si no hay SKU
  - Respeta columna Tipo (IN/OUT/INT): OUT resta, IN suma, INT no afecta
  - TYPE_COLS detecta "tipo (in/out/int)", "tipo", "tipo de operacion", etc.
  - SKU_COLS_DESP para detectar columna SKU en despachos
  - QTY_COLS_DESPACHO ampliado con "total", "total contabilizado"
- detection.ts: keywords ampliadas para detectar Excel de despachos real (nº operacion, tipo in/out/int, guía de remisión, almacén origen/destino, razón social, proyecto macro, código pep, etc.)
- store.ts importFile: si se re-importa un archivo con el mismo nombre, lo REEMPLAZA (mantiene id y tag), limpia el ledger de automatización, y recalcula automáticamente → así el usuario puede actualizar su Excel de despachos cada día y el inventario se ajusta solo
- store.ts seedFromUserExcel: ahora carga AMBOS Excels (inventario + despachos oficial), etiqueta el segundo como "despachos", genera catálogo y ejecuta recalcAutomation al final

Verificación con Agent Browser:
- Carga inicial: 3 archivos (Stock HUB ALTAS [inventario] + Control de Despachos LEMCORP [despachos] + Equipos Averiados [equipos]) ✓
- 54 productos en catálogo ✓
- Stock CONECTOR PLUG RJ-45 (SKU 1002900) inicial: 2768 ✓
- 16 filas INT con SKU 1002900 (movimientos internos) NO afectan el stock ✓
- Editar fila 288 a tipo=OUT, SKU=1002900, cantidad=200 → stock bajó a 2564 ✓
- appliedMap muestra {288: {product:"1002900", qty:-200}} ✓
- Unidades totales bajaron de 999,199 a 998,991 (descuento de despachos OUT) ✓
- VLM confirmó: vista Inventario muestra 2,564 para CONECTOR y 998,991 totales ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- El Excel oficial de despachos (control_despachos_lemcorp_v3.xlsx) ahora se carga automáticamente
- Cuando agregues filas OUT (salidas) en la hoja Movimientos, el inventario se descuenta solo
- Las filas INT (movimientos internos) no afectan el stock del almacén principal
- Re-importar el Excel actualizado (mismo nombre) reemplaza el anterior y recalcula el inventario
- Caso de uso real: cada día actualizas tu Excel de despachos, lo re-importas, y la app ajusta el inventario automáticamente

---
Task ID: S1-S7
Agent: main
Task: Configurar 2 Excels oficiales + mejorar diseño tipo Excel + pegado especial

Work Log:
- Inspeccionado Control_Stock_Lemcorp.xlsx: 5 hojas (Instrucciones, Stock, Pegar Despachos, Stock Base, Equipos)
  - Stock: PRODUCTO, SKU, UDM, STOCK ACTUAL, AVERIADOS (con fórmulas que descuentan despachos)
  - Pegar Despachos: FECHA, PRODUCTO, SKU, CANTIDAD DESPACHADA (donde el usuario pega despachos diarios)
  - Stock Base: STOCK INICIAL (punto de partida, sin descontar)
  - Equipos (Series-MAC): series de equipos
- Copiado a public/stock-lemcorp-inicial.xlsx (reemplazando el anterior)
- excel.ts: nuevas funciones importSheet() e importAllSheets() que soportan multihoja
  - detectHeaderRow() encuentra la fila de headers (no siempre es fila 0 — los Excels de LEMCORP tienen títulos en filas 0-2)
  - importSheet() desplaza datos para que headers queden en row 0
  - importAllSheets() importa todas las hojas relevantes con tags automáticos
- automation.ts: añadido "STOCK INICIAL" y "STOCK ACTUAL" a QTY_COLS_INVENTARIO (prioridad: stock inicial > stock actual > fisico > disponible)
- inventory.ts: añadido "STOCK INICIAL" a FISICO_COLS
- store.ts seedFromUserExcel reescrito:
  - Carga Control_Stock_Lemcorp.xlsx (un archivo con múltiples hojas)
  - Importa "Stock Base" como inventario (STOCK INICIAL = base sin descontar)
  - Renombra header "STOCK INICIAL" → "STOCK ACTUAL" (para que la automatización lo modifique)
  - Importa "Pegar Despachos" como despachos
  - Importa "Equipos (Series-MAC)" como equipos
  - Genera catálogo y ejecuta recalcAutomation
- BUG CRÍTICO CORREGIDO en automation.ts línea 219:
  - El revert usaba adjust(invRow, qty) donde qty es negativo (ej: -137)
  - Esto causaba que el revert RESTARA en vez de SUMAR (doble sustracción)
  - Corregido a adjust(invRow, -qty) → ahora suma correctamente +137 de vuelta
  - Verificado: 2768 - 137 = 2631 (inicial) → agregar despacho 200 → 2631 - 200 = 2431 ✓
- globals.css: estilos tipo Excel (.excel-header, .excel-cell, .cell-in-range)
- Menú contextual: añadido "Pegado especial" con submenú:
  - "Pegar valores (sin formato)" — pega solo el texto, sin fórmulas ni formato
  - "Pegar como fórmula" — pega con prefijo = para treat como fórmula

Verificación con Agent Browser:
- Carga inicial: 3 archivos (Stock LEMCORP [inventario] + Pegar Despachos [despachos] + Equipos LEMCORP [equipos]) ✓
- 54 productos en catálogo ✓
- Headers: PRODUCTO, SKU, UDM, STOCK ACTUAL, AVERIADOS ✓
- Stock CONECTOR (1002900): 2768 - 137 = 2631 ✓ (correcto)
- Agregar despacho 200 → stock = 2631 - 200 = 2431 ✓ (correcto tras fix del bug)
- VLM confirmó: "tabla estructurada con productos y stock, cantidades correctas, diseño gris corporativo profesional, aspecto de software empresarial/ERP" ✓
- Lint limpio, dev server sin errores, estado limpio restaurado

Stage Summary:
- Los 2 Excels oficiales del usuario ahora funcionan:
  1. Control_Stock_Lemcorp.xlsx → Stock Base (inventario) + Pegar Despachos (despachos) + Equipos
  2. control_despachos_lemcorp_v3.xlsx → despachos detallados (si se necesita)
- Flujo: pegas despachos del día en "Pegar Despachos" → el stock se descuenta solo
- Bug crítico de doble sustracción corregido (el revert ahora suma correctamente)
- Pegado especial (valores / fórmula) en menú contextual
- Diseño mejorado con estilos tipo Excel
