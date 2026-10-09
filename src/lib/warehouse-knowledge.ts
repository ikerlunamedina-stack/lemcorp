// Base de conocimientos de logística, almacén y gestión de inventario
// Esta es la "base de datos" de Alana — instrucciones de cómo manejar un almacén virtual.
// Inspirada en repositorios públicos de GitHub sobre warehouse management, logistics e inventory control.
// Se usa con RAG: buscar conocimiento relevante → enviar al LLM (Groq) → generar respuesta.

export interface KnowledgeEntry {
  keywords: string[];
  topic: string;
  category: "inventario" | "operaciones" | "logistica" | "telecom" | "gestion" | "general";
  response: string;
}

export const WAREHOUSE_KNOWLEDGE: KnowledgeEntry[] = [
  // ─── INVENTARIO ───
  {
    keywords: ["abc", "clasificacion abc", "analisis abc", "pareto inventario", "80/20", "clase a", "clase b", "clase c"],
    topic: "Análisis ABC",
    category: "inventario",
    response: `Análisis ABC (basado en el Principio de Pareto 80/20):

• Clase A: 20% de los productos que representan el 80% del valor. Control estricto, revisiones frecuentes, stock exacto.
• Clase B: 30% de los productos, 15% del valor. Control moderado, revisiones mensuales.
• Clase C: 50% de los productos, 5% del valor. Control simple, pedidos en lote, revisiones trimestrales.

Para aplicarlo en VRS: clasifica productos por valor de consumo anual (cantidad × precio). Clase A = routers, ONTs (alto valor). Clase C = conectores, cables cortos (bajo valor).

Prioriza: control estricto en Clase A (revisiones semanales), moderado en B, simple en C.`,
  },
  {
    keywords: ["punto de reorden", "reorder point", "punto de pedido", "cuando pedir", "stock minimo", "rop"],
    topic: "Punto de Reorden",
    category: "inventario",
    response: `Punto de Reorden (ROP):

Nivel de stock al que debes hacer un nuevo pedido antes de que se agote.

ROP = (Demanda diaria × Tiempo de entrega en días) + Stock de seguridad

Ejemplo: consumes 5 routers/día, proveedor tarda 7 días, stock de seguridad 10:
ROP = (5 × 7) + 10 = 45 routers

Cuando el stock llega a 45, pide más. En VRS, el campo "stock mínimo" funciona como ROP — cuando baja, se activa la alerta.

Revisa puntos de reorden mensualmente porque el consumo cambia.`,
  },
  {
    keywords: ["stock de seguridad", "safety stock", "inventario de seguridad", "colchon", "stock adicional"],
    topic: "Stock de Seguridad",
    category: "inventario",
    response: `Stock de Seguridad (Safety Stock):

Inventario adicional para proteger contra demanda inesperada, retrasos del proveedor o variabilidad.

Fórmula: SS = (Demanda máxima diaria × Tiempo entrega máximo) - (Demanda promedio × Tiempo promedio)

Ejemplo: normalmente 5/día pero a veces 8, proveedor tarda 7 días pero a veces 10:
SS = (8 × 10) - (5 × 7) = 80 - 35 = 45 unidades extra

En VRS, el campo "minStock" es tu stock de seguridad. Para Clase A (alto valor), usa SS más alto. Para Clase C, más bajo.`,
  },
  {
    keywords: ["fifo", "lifo", "primeras entradas", "ultimas entradas", "peps", "ueps"],
    topic: "FIFO vs LIFO",
    category: "inventario",
    response: `FIFO (Primeras Entradas, Primeras Salidas) vs LIFO (Últimas Entradas, Primeras Salidas):

FIFO: los productos que entraron primero deben salir primero.
• Evita obsolescencia, productos más frescos. Método más común.
• Ideal para: equipos electrónicos (routers, ONTs), productos con fecha de vencimiento.
• En VRS: despacha primero los equipos con series más antiguas.

LIFO: los últimos en entrar son los primeros en salir.
• Reduce impacto de inflación en costos. Útil para productos no perecederos.

Para un almacén de telecomunicaciones como VRS, FIFO es correcto porque los equipos electrónicos se vuelven obsoletos. Verifica la antigüedad en /equipos.`,
  },
  {
    keywords: ["eoq", "economic order quantity", "cantidad economica de pedido", "lote optimo", "cuanto pedir"],
    topic: "Cantidad Económica de Pedido (EOQ)",
    category: "inventario",
    response: `Cantidad Económica de Pedido (EOQ):

Cantidad óptima de pedido que minimiza costos totales (costo de pedido + costo de almacenamiento).

EOQ = √(2 × D × S / H)
• D = Demanda anual
• S = Costo de hacer un pedido
• H = Costo de almacenamiento por unidad/año

Ejemplo: 1000 routers/año, S/50 por pedido, S/10 almacenamiento:
EOQ = √(2 × 1000 × 50 / 10) = √10000 = 100 routers por pedido (10 pedidos/año)

Usa EOQ para productos Clase A donde optimizar el tamaño del pedido tiene mayor impacto económico.`,
  },
  {
    keywords: ["rotacion de inventario", "tasa de rotacion", "rotacion stock", "dias de inventario"],
    topic: "Rotación de Inventario",
    category: "inventario",
    response: `Rotación de Inventario:

Mide cuántas veces se renueva el inventario al año. Mayor = mejor.

Fórmula: Rotación = Costo de ventas / Inventario promedio

Días de inventario = 365 / Rotación

Ejemplo: si vendes S/500,000/año y tu inventario promedio es S/100,000:
Rotación = 500,000 / 100,000 = 5 veces/año
Días de inventario = 365 / 5 = 73 días

Interpretación:
• Rotación alta (8+): inventario eficiente, poco capital inmovilizado
• Rotación baja (<3): exceso de inventario, capital inmovilizado

En VRS puedes ver el valor total del inventario en el Dashboard y comparar con los despachos del año.`,
  },
  {
    keywords: ["conteo ciclico", "cycle counting", "inventario fisico", "auditoria inventario", "recuento", "conteo"],
    topic: "Conteo Cíclico",
    category: "inventario",
    response: `Conteo Cíclico (Cycle Counting):

Verificación de inventario donde cuentas una parte cada día/semana/mes en vez de un conteo anual completo.

Tipos:
• Por valor ABC: Clase A semanal, B mensual, C trimestral
• Por ubicación: una sección del almacén cada semana
• Aleatorio: productos al azar cada día

Ventajas: no paraliza el almacén, detecta errores pronto, mejora precisión continuamente.

En VRS: usa /pistolear para conteos cíclicos. Escanea series, compara con el sistema, registra diferencias. El sistema guarda todo para auditoría.

Meta: precisión de inventario >95%.`,
  },
  {
    keywords: ["stockout", "quiebre de stock", "ruptura de stock", "sin stock", "agotado", "desabastecimiento"],
    topic: "Quiebre de Stock",
    category: "inventario",
    response: `Quiebre de Stock (Stockout):

Cuando un producto se agota y no puedes despachar. Causas:
• Punto de reorden mal configurado
• Demanda inesperada
• Retraso del proveedor
• Error en el conteo de inventario

Costos del quiebre:
• Pérdida de ventas/despachos
• Insatisfacción del cliente/técnico
• Costos de urgencia (pedidos exprés)

Prevención:
1. Mantén stock de seguridad adecuado
2. Revisa puntos de reorden mensualmente
3. Monitorea alertas de bajo stock en VRS diariamente
4. Diversifica proveedores para Clase A
5. Usa conteos cíclicos para mantener precisión del inventario`,
  },

  // ─── OPERACIONES ───
  {
    keywords: ["recepcion", "recepcion de mercancia", "guia de remision", "recepcion sunat", "como recibir", "ingreso mercancia"],
    topic: "Recepción de Mercancía",
    category: "operaciones",
    response: `Proceso de Recepción de Mercancía:

1. Verificar la guía de remisión SUNAT contra el pedido/orden de compra (RUC, cantidades, descripción, motivo del traslado).

2. Conteo físico: contar unidades recibidas. Si hay diferencia, anotar observaciones en la guía.

3. Inspección visual: verificar que los equipos no tengan daños visibles.

4. Registro de series: para equipos con serie (routers, ONTs, decodificadores), escanear cada serie con /pistolear.

5. Ubicación: llevar productos a su ubicación asignada en el almacén.

6. Actualizar inventario: en VRS, la recepción se registra en /recepciones subiendo la guía SUNAT en PDF.

7. Documentar: guardar la guía firmada como comprobante.

NUNCA recibas mercancía sin guía de remisión. Si hay diferencias, anota "recibido con observaciones" antes de firmar.`,
  },
  {
    keywords: ["despacho", "picking", "como despachar", "preparar pedido", "empaque", "packing", "salida mercancia"],
    topic: "Proceso de Despacho",
    category: "operaciones",
    response: `Proceso de Despacho (Picking + Packing):

1. Recibir orden de despacho (del técnico o destino).

2. Picking: extraer productos del inventario según la orden. Verificar SKU y cantidad. Para equipos con serie, escanear la serie. Aplicar FIFO (entregar primero lo más antiguo).

3. Packing: empaquetar. Proteger equipos frágiles. Incluir guía si es traslado entre almacenes.

4. Verificación: doble check de SKU, cantidad y series.

5. Registro: en VRS, registrar en /despachos. El sistema descuenta el stock automáticamente.

6. Firma: el destinatario firma conformidad.

Tipos en VRS:
• Despacho a técnico: equipos para instalación en campo
• Transferencia: traslado entre almacenes
• Devolución: equipos que regresan del campo (cambiar estado a averiado o retiro)`,
  },
  {
    keywords: ["pistolear", "escanear", "lector codigo", "codigo de barras", "pistoleo", "scan"],
    topic: "Pistoleo / Escaneo",
    category: "operaciones",
    response: `Pistoleo (Escaneo de series):

Herramienta para registrar equipos por su número de serie usando un lector de código de barras.

Usos en VRS:
1. Recepción: escanear series de equipos nuevos que ingresan al almacén
2. Devoluciones: escanear equipos averiados o de retiro que regresan del campo
3. Conteo cíclico: verificar que las series físicas coincidan con el sistema
4. Despachos: escanear series que se entregan al técnico

Flujo:
1. Ve a /pistolear
2. Configura el estado (disponible/averiado/en_retiro) y ubicación de guardado
3. Escanea cada serie (el lector envía Enter automáticamente)
4. Revisa el preview antes de guardar
5. Guarda → el sistema actualiza el inventario automáticamente
6. Exporta a Excel si necesitas el registro físico

Consejo: el lector de código de barras funciona como un teclado. Solo enfoca el input y dispara.`,
  },
  {
    keywords: ["putaway", "almacenamiento", "ubicacion", "estanteria", "organizacion fisica", "layout"],
    topic: "Putaway y Organización Física",
    category: "operaciones",
    response: `Putaway (Almacenamiento):

Proceso de ubicar los productos recibidos en su lugar asignado.

Principios:
• Productos de alta rotación cerca de la salida (reduce tiempo de picking)
• Productos pesados abajo, livianos arriba
• Productos similares agrupados
• Pasillos despejados y etiquetados

En VRS: el campo "ubicación" de cada equipo indica dónde está guardado. Opciones:
• Almacén: zona principal de stock
• Taller: equipos en reparación
• Cuarto Técnico: equipos reservados
• Bodega de Averías: equipos averiados pendientes de baja
• Bodega de Retiro: equipos cambiados en campo
• Estantería: ubicación específica

Consejo: etiqueta cada estante con un código (A1, B2, etc.) y úsalo en el campo ubicación de VRS para encontrar equipos rápidamente.`,
  },

  // ─── LOGÍSTICA ───
  {
    keywords: ["kpi", "indicadores", "metricas", "tasa rotacion", "precision inventario", "exactitud picking"],
    topic: "KPIs de Almacén",
    category: "logistica",
    response: `KPIs principales de gestión de almacén:

1. Rotación de inventario = Costo de ventas / Inventario promedio (mayor = mejor)
2. Precisión de inventario = Registros correctos / Total × 100 (meta >95%)
3. Exactitud de picking = Pedidos sin errores / Total × 100 (meta >99%)
4. Costo de almacenamiento = Costo total / Valor del inventario
5. Tiempo de entrega interno = Recepción → Disponibilidad (meta <24h)
6. Tasa de devoluciones = Devoluciones / Despachos × 100 (menor = mejor)

En VRS puedes ver estos KPIs en el Dashboard y en /kpis.`,
  },
  {
    keywords: ["5s", "metodo 5s", "organizacion almacen", "seiri", "seiton", "seiso", "seiketsu", "shitsuke"],
    topic: "Metodología 5S",
    category: "gestion",
    response: `Metodología 5S para almacén:

1. Seiri (Clasificar): separar lo necesario de lo innecesario. Elimina averiados, obsoletos, embalajes vacíos.

2. Seiton (Ordenar): cada cosa en su lugar. Etiqueta estantes, define ubicaciones. En VRS usa el campo "ubicación".

3. Seiso (Limpiar): almacén limpio. Detecta derrames, daños, problemas rápido.

4. Seiketsu (Estandarizar): procedimientos estándar. Documenta cómo recibir, almacenar, despachar.

5. Shitsuke (Disciplina): mantener las 4S en el tiempo. Auditorías periódicas.

Beneficios: menos errores, menos tiempo buscando, menos accidentes, más espacio, mejor imagen.`,
  },
  {
    keywords: ["jit", "just in time", "justo a tiempo", "inventario cero", "stock minimo"],
    topic: "Just In Time (JIT)",
    category: "logistica",
    response: `Just In Time (JIT):

Filosofía de recibir productos exactamente cuando se necesitan, minimizando inventario.

Ventajas: menor costo de almacenamiento, menos espacio, menos obsolescencia, mejor flujo de caja.
Desventajas: requiere proveedores confiables, mayor riesgo de quiebres, necesita sistema robusto.

¿Aplica a VRS? Parcialmente:
• Clase A (routers, ONTs): stocks bajos, reposición frecuente
• Clase C (conectores, cables): mantener stock de seguridad (costo almacenamiento mínimo)

Usa ABC para decidir qué productos gestionar con JIT y cuáles con stock de seguridad.`,
  },
  {
    keywords: ["cross docking", "transbordo", "directo"],
    topic: "Cross-Docking",
    category: "logistica",
    response: `Cross-Docking:

Recibir mercancía y enviarla inmediatamente sin almacenarla. El producto pasa del muelle de recepción al de despacho.

Ventajas: reduce costos de almacenamiento, acelera el flujo, menos manipulación.
Desventajas: requiere coordinación precisa, necesita espacio de tránsito.

Aplica a VRS cuando: recibes equipos que ya están asignados a un técnico/despacho específico. En vez de almacenarlos, los entregas directamente.`,
  },
  {
    keywords: ["lead time", "tiempo de entrega", "tiempo de respuesta proveedor", "plazo"],
    topic: "Lead Time",
    category: "logistica",
    response: `Lead Time (Tiempo de Entrega):

Tiempo desde que haces el pedido hasta que recibes la mercancía. Incluye:
• Tiempo de procesamiento del proveedor
• Tiempo de fabricación (si aplica)
• Tiempo de transporte
• Tiempo de recepción y verificación

Lead Time más corto = menor stock de seguridad necesario = menos capital inmovilizado.

Para reducirlo:
• Negocia tiempos de entrega con proveedores
• Diversifica proveedores (alternativa si uno falla)
• Usa pedidos anticipados (pre-pedido antes de llegar al ROP)
• Considera proveedores locales para productos Clase A`,
  },

  // ─── TELECOM ───
  {
    keywords: ["router", "ont", "decodificador", "modem", "repetidor", "equipo telecom", "serie equipo", "hgu"],
    topic: "Gestión de Equipos de Telecomunicaciones",
    category: "telecom",
    response: `Gestión de equipos de telecomunicaciones:

Tipos:
• Router/ONT: da internet al cliente. Serie única.
• Decodificador IPTV: para TV. Serie única.
• Repetidor WiFi: amplía señal WiFi.

Estados en VRS:
• Disponible: en almacén, listo para despachar
• Averiado: no funciona, necesita reparación o baja
• En retiro: fue cambiado por nuevo en casa del cliente, regresó al almacén

Control por serie: cada equipo tiene serie única (etiqueta del fabricante). Permite trazabilidad, garantía y detección de robos.

En VRS: usa /pistolear para escanear series. /equipos para ver estado por modelo. /series para buscar serie específica.

Consejo: al recibir devolución, escanea con /pistolear y marca estado correcto (averiado o retiro).`,
  },
  {
    keywords: ["conector", "cable", "fibra optica", "ftth", "rj45", "utp", "splitter", "roseta", "patch cord"],
    topic: "Materiales de Telecomunicaciones",
    category: "telecom",
    response: `Materiales de telecomunicaciones (sin serie, control por cantidad):

• Conectores FTTH PPC: para empalmes de fibra óptica
• Cable UTP Cat6: para red ethernet
• Splitter 1x4 / 1x8: divide señal de fibra
• Roseta Optical: terminator de fibra en el hogar
• Patch Cord: cable de conexión entre equipos
• Conectores RJ-45: para cables ethernet

Diferencia con equipos: los materiales NO tienen número de serie. Se controlan por cantidad (stock). Los equipos (routers, ONTs) SÍ tienen serie y se controlan individualmente.

En VRS: los materiales están en /inventario con su stock mínimo. Los equipos están en /equipos y /series con control por serie.

Consejo: define stock de seguridad para conectores y cables (Clase C) porque su costo de almacenamiento es mínimo pero un quiebre puede detener una instalación.`,
  },
  {
    keywords: ["guia de remision", "sunat", "guia", "traslado", "comprobante"],
    topic: "Guía de Remisión SUNAT",
    category: "telecom",
    response: `Guía de Remisión SUNAT:

Documento que acompaña el traslado de bienes. Es obligatorio para transporte de mercancía en Perú.

Datos de la guía:
• RUC y nombre del remitente
• RUC y nombre del destinatario
• Punto de partida y llegada
• Motivo del traslado (ej: "MATERIAL A OBRA")
• Descripción de los productos
• Cantidad y unidad de medida
• Número de guía (ej: "EG07-00005170")

Tipos:
• Guía de remisión del remitente (transporte desde el almacén hacia el campo)
• Guía de remisión del transportista (cuando un tercero transporta)

En VRS: /recepciones acepta guías en PDF. El sistema extrae automáticamente los datos y registra la recepción.

NUNCA recibas mercancía sin guía. Si hay diferencias, anota "con observaciones" antes de firmar.`,
  },

  // ─── GESTIÓN ───
  {
    keywords: ["mejores practicas", "buenas practicas", "consejos", "recomendaciones", "tips", "recomendame"],
    topic: "Mejores Prácticas de Almacén",
    category: "gestion",
    response: `Mejores prácticas de gestión de almacén:

1. Organización física: zonas claras (recepción, almacenamiento, despacho, devoluciones, averiados). Etiqueta estantes. Pasillos despejados.

2. Control de inventario: conteos cíclicos semanales para Clase A. Stock de seguridad actualizado. Revisa ROP mensualmente.

3. Recepción: verifica guía SUNAT. Cuenta físicamente. Escanea series con /pistolear.

4. Despacho: aplica FIFO. Doble verificación. Registra en /despachos.

5. Devoluciones: clasifica (averiado vs retiro). Escanea serie. Asigna ubicación.

6. Tecnología: usa lector de código de barras. Mantén el sistema actualizado. Revisa alertas diariamente.

7. Seguridad: acceso controlado. Inventario bajo llave. Registro de entradas/salidas.`,
  },
  {
    keywords: ["terminos", "glosario", "sku", "lead time", "picking", "putaway", "stockout", "backorder", "pallet", "lote"],
    topic: "Glosario de Logística",
    category: "general",
    response: `Glosario de logística:

• SKU: código único de un producto (en VRS: campo "sku")
• Lead Time: tiempo desde pedido hasta recepción
• Picking: extraer productos del inventario para despacho
• Putaway: ubicar productos recibidos en su lugar
• Stockout: quiebre de stock (producto agotado)
• Backorder: pedido pendiente por falta de stock
• Drop shipping: enviar directo del proveedor al cliente
• Cross-docking: recibir y enviar sin almacenar
• Cycle counting: conteo cíclico (verificar inventario por partes)
• Pallet: tarima para almacenar/transportar mercancía
• FIFO: primeras entradas, primeras salidas
• LIFO: últimas entradas, primeras salidas
• ROP: punto de reorden
• EOQ: cantidad económica de pedido
• SS: stock de seguridad
• ABC: clasificación por valor (Pareto 80/20)
• KPI: indicador clave de rendimiento
• JIT: just in time (inventario mínimo)
• WMS: warehouse management system (como VRS)`,
  },
  {
    keywords: ["mision", "que haces", "para que sirves", "que puedes hacer", "ayuda", "comandos"],
    topic: "Capacidades de Alana",
    category: "general",
    response: `Soy Alana, asistente del almacén VRS. Puedo:

1. ANÁLISIS DE STOCK: detectar bajo stock, calcular ratios, priorizar compras
2. CÁLCULO DE CONSUMO: usar datos reales de despachos de 7 y 30 días
3. RECOMENDACIONES DE COMPRA: sugerir qué pedir, cuánto, justificando con datos
4. TRAZABILIDAD DE EQUIPOS: reportar estado de equipos, buscar por serie
5. GESTIÓN DE PERSONAL: informar sobre el equipo del almacén
6. ALERTAS TEMPRANAS: anticipar quiebres de stock
7. REPORTES EJECUTIVOS: resúmenes con KPIs, tendencias y acciones
8. PLANIFICACIÓN: calcular necesidades para un período
9. CONOCIMIENTO DE LOGÍSTICA: responder sobre ABC, FIFO, EOQ, KPIs, 5S, JIT, etc.

También puedo ejecutar acciones del sistema:
• Añadir productos al inventario
• Registrar despachos
• Añadir equipos por serie
• Crear notas en el bloc
• Crear recordatorios
• Cambiar el tema de la interfaz

Y puedo hacer cálculos matemáticos: "cuánto es 15 × 23", "20% de 500".`,
  },
];

/**
 * Busca la entrada de conocimiento más relevante para el mensaje del usuario.
 * Usa scoring por longitud de keyword (keywords más largas valen más).
 * Devuelve hasta 3 entradas relevantes para dar contexto al LLM.
 */
export function buscarConocimiento(mensaje: string): string | null {
  const msg = mensaje.toLowerCase().trim();

  let entries: Array<{ entry: KnowledgeEntry; score: number }> = [];

  for (const entry of WAREHOUSE_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (msg.includes(kw.toLowerCase())) {
        score += kw.length; // keywords más largas = más específicas = valen más
      }
    }
    if (score > 0) {
      entries.push({ entry, score });
    }
  }

  // Ordenar por score descendente
  entries.sort((a, b) => b.score - a.score);

  // Devolver la mejor entrada (o null si no hay match)
  if (entries.length > 0 && entries[0].score > 0) {
    return entries[0].entry.response;
  }

  return null;
}

/**
 * Busca hasta 3 entradas de conocimiento relevantes para usar como contexto del LLM (RAG).
 * Devuelve un string con las entradas encontradas, separadas por líneas.
 */
export function buscarContextoConocimiento(mensaje: string): string {
  const msg = mensaje.toLowerCase().trim();

  let entries: Array<{ entry: KnowledgeEntry; score: number }> = [];

  for (const entry of WAREHOUSE_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (msg.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    if (score > 0) {
      entries.push({ entry, score });
    }
  }

  entries.sort((a, b) => b.score - a.score);

  if (entries.length === 0) return "";

  // Tomar hasta 3 entradas más relevantes
  const top = entries.slice(0, 3);
  return top
    .map(({ entry }, i) => `--- CONOCIMIENTO ${i + 1}: ${entry.topic} ---\n${entry.response}`)
    .join("\n\n");
}
