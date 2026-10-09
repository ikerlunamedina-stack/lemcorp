// Base de conocimientos de logística, almacén y gestión de inventario
// Inspirada en repositorios públicos de GitHub sobre warehouse management, logistics e inventory control.
// Esto hace que Alana sea inteligente incluso sin Gemini (fallback).

export interface KnowledgeEntry {
  keywords: string[];
  topic: string;
  response: string;
}

export const WAREHOUSE_KNOWLEDGE: KnowledgeEntry[] = [
  // ─── ANÁLISIS ABC ───
  {
    keywords: ["abc", "clasificacion abc", "analisis abc", "pareto inventario", "80/20"],
    topic: "Análisis ABC",
    response: `Análisis ABC (basado en el Principio de Pareto 80/20):

• Clase A: 20% de los productos que representan el 80% del valor/inventario. Requieren control estricto, revisiones frecuentes, stock exacto.
• Clase B: 30% de los productos que representan el 15% del valor. Control moderado, revisiones periódicas.
• Clase C: 50% de los productos que representan el 5% del valor. Control simple, pedidos en lote, revisiones anuales.

Para aplicarlo en VRS: clasifica tus productos por valor de consumo anual (cantidad consumida × precio). Los Clase A son los que más valor mueven (routers, ONTs), los Clase C son los de bajo valor (conectores, cables cortos).

Esto te ayuda a priorizar qué productos necesitan control más estricto y cuáles puedes gestionar de forma más relajada.`,
  },

  // ─── PUNTO DE REORDEN ───
  {
    keywords: ["punto de reorden", "reorder point", "punto de pedido", "cuando pedir", "stock minimo"],
    topic: "Punto de Reorden",
    response: `Punto de Reorden (ROP - Reorder Point):

Es el nivel de stock al que debes hacer un nuevo pedido antes de que se agote. Se calcula:

ROP = (Demanda diaria × Tiempo de entrega en días) + Stock de seguridad

Ejemplo: si consumes 5 routers/día y el proveedor tarda 7 días en entregar, y tienes un stock de seguridad de 10:
ROP = (5 × 7) + 10 = 45 routers

Cuando el stock llega a 45, debes pedir más. En VRS, el campo "stock mínimo" de cada producto funciona como el ROP — cuando el stock baja al mínimo, te avisamos con una alerta.

Consejo: revisa tus puntos de reorden mensualmente porque el consumo cambia.`,
  },

  // ─── STOCK DE SEGURIDAD ───
  {
    keywords: ["stock de seguridad", "safety stock", "inventario de seguridad", "colchon"],
    topic: "Stock de Seguridad",
    response: `Stock de Seguridad (Safety Stock):

Es el inventario adicional que mantienes para protegerte contra:
• Demdemanda inesperada (picos de consumo)
• Retrasos del proveedor
• Variabilidad en el tiempo de entrega

Fórmula simple: Stock de seguridad = (Demanda máxima diaria × Tiempo de entrega máximo) - (Demanda promedio diaria × Tiempo de entrega promedio)

Ejemplo: si normalmente consumes 5/día pero a veces llegas a 8, y el proveedor tarda 7 días pero a veces 10:
SS = (8 × 10) - (5 × 7) = 80 - 35 = 45 unidades extra

En VRS, el campo "minStock" de cada producto es tu stock de seguridad. Cuando el stock baja a ese nivel, se activa la alerta de bajo stock.

Consejo: para productos Clase A (alto valor), usa un stock de seguridad más alto. Para Clase C, puedes tenerlo más bajo.`,
  },

  // ─── FIFO / LIFO ───
  {
    keywords: ["fifo", "lifo", "primeras entradas", "ultimas entradas", "peps", "ueps"],
    topic: "FIFO vs LIFO",
    response: `FIFO (Primeras Entradas, Primeras Salidas) vs LIFO (Últimas Entradas, Primeras Salidas):

FIFO: los productos que entraron primero al almacén deben salir primero.
• Ventajas: evita obsolescencia, productos más frescos, método más común.
• Ideal para: equipos electrónicos (routers, ONTs), productos con fecha de vencimiento.
• En VRS: cuando despachas, deberías entregar los equipos con series más antiguas primero.

LIFO: los productos que entraron últimos salen primero.
• Ventajas: reduce impacto de inflación en costos, útil para productos no perecederos.
• Ideal para: materiales de construcción, metales.

Para un almacén de telecomunicaciones como VRS, FIFO es el método correcto porque los equipos electrónicos pueden volverse obsoletos. Siempre despacha primero los equipos que llevan más tiempo en el almacén (puedes ver la antigüedad en /equipos).`,
  },

  // ─── EOQ ───
  {
    keywords: ["eoq", "economic order quantity", "cantidad economica de pedido", "lote optimo"],
    topic: "Cantidad Económica de Pedido (EOQ)",
    response: `Cantidad Económica de Pedido (EOQ - Economic Order Quantity):

Es la cantidad óptima de pedido que minimiza los costos totales de inventario (costo de pedido + costo de almacenamiento).

Fórmula: EOQ = √(2 × D × S / H)

Donde:
• D = Demanda anual
• S = Costo de hacer un pedido
• H = Costo de almacenamiento por unidad por año

Ejemplo: si consumes 1000 routers/año, cada pedido cuesta S/50 procesar, y almacenar un router cuesta S/10/año:
EOQ = √(2 × 1000 × 50 / 10) = √10000 = 100 routers por pedido

Esto significa que deberías pedir 100 routers cada vez, lo que equivale a 10 pedidos al año.

Consejo: usa EOQ para productos Clase A (alto valor) donde optimizar el tamaño del pedido tiene mayor impacto económico.`,
  },

  // ─── KPIs DE ALMACÉN ───
  {
    keywords: ["kpi", "indicadores", "metricas almacen", "tasa de rotacion", "precisión inventario"],
    topic: "KPIs de Almacén",
    response: `KPIs principales de gestión de almacén:

1. Tasa de rotación de inventario = (Costo de ventas / Inventario promedio)
   • Mide cuántas veces se renueva el inventario al año. Mayor = mejor.

2. Precisión de inventario = (Registros correctos / Total de registros) × 100
   • Debe ser >95%. Se verifica con conteos cíclicos.

3. Exactitud de picking = (Pedidos sin errores / Total de pedidos) × 100
   • Debe ser >99%.

4. Costo de almacenamiento = (Costo total de almacenamiento / Valor del inventario)
   • Incluye renta, personal, equipos, servicios.

5. Tiempo de entrega interno = Tiempo desde recepción hasta disponibilidad
   • Debe ser <24h para productos de alta rotación.

6. Tasa de devoluciones = (Devoluciones / Despachos totales) × 100
   • Mide calidad de los despachos. Menor = mejor.

En VRS puedes ver estos KPIs en el Dashboard y en /kpis.`,
  },

  // ─── CONTEO CÍCLICO ───
  {
    keywords: ["conteo ciclico", "inventario fisico", "auditoria inventario", "recuento"],
    topic: "Conteo Cíclico",
    response: `Conteo Cíclico (Cycle Counting):

Es una técnica de verificación de inventario donde en lugar de hacer un conteo completo anual, cuentas una parte del inventario cada día/semana/mes.

Tipos de conteo cíclico:
• Por valor ABC: cuenta Clase A semanal, Clase B mensual, Clase C trimestral.
• Por ubicación: cuenta una sección del almacén cada semana.
• Por aleatorio: selecciona productos al azar cada día.

Ventajas:
• No paraliza el almacén (a diferencia del conteo anual)
• Detecta errores pronto
• Mejora la precisión del inventario continuamente

En VRS: usa /pistolear para hacer conteos cíclicos. Escanea las series de un modelo, compara con lo que dice el sistema, y registra las diferencias. El sistema guarda el registro para auditoría.`,
  },

  // ─── 5S EN ALMACÉN ───
  {
    keywords: ["5s", "metodo 5s", "organizacion almacen", "seiri seiton", "seiri", "seiton"],
    topic: "Metodología 5S",
    response: `Metodología 5S para almacén:

1. Seiri (Clasificar): separar lo necesario de lo innecesario. Elimina equipos averiados, materiales obsoletos, embalajes vacíos.

2. Seiton (Ordenar): cada cosa en su lugar. Etiqueta estantes, define ubicaciones fijas para cada tipo de producto. En VRS usa el campo "ubicación" para saber dónde está cada equipo.

3. Seiso (Limpiar): mantener el almacén limpio. Un almacén limpio permite detectar derrames, daños y problemas rápidamente.

4. Seiketsu (Estandarizar): crear procedimientos estándar. Documenta cómo recibir, almacenar, despachar. En VRS, las guías de remisión SUNAT son parte de la estandarización.

5. Shitsuke (Disciplina): mantener las 4S anteriores en el tiempo. Auditorías periódicas.

Beneficios: menos errores, menos tiempo buscando cosas, menos accidentes, más espacio, mejor imagen.`,
  },

  // ─── RECEPCIÓN DE MERCANCÍA ───
  {
    keywords: ["recepcion", "recepcion de mercancia", "guia de remision", "recepcion sunat", "como recibir"],
    topic: "Recepción de Mercancía",
    response: `Proceso de recepción de mercancía:

1. Verificar la guía de remisión SUNAT contra el pedido/orden de compra.
   • Revisar: RUC del remitente, cantidades, descripción de productos, motivo del traslado.

2. Conteo físico: contar las unidades recibidas. Si hay diferencia con la guía, anotar observaciones.

3. Inspección visual: verificar que los equipos no tengan daños visibles.

4. Registro de series: para equipos con serie (routers, ONTs, decodificadores), escanear cada serie con /pistolear.

5. Ubicación: llevar los productos a su ubicación asignada en el almacén.

6. Actualizar inventario: en VRS, la recepción se registra en /recepciones subiendo la guía SUNAT en PDF (el sistema extrae automáticamente los datos).

7. Documentar: guardar la guía firmada como comprobante.

Consejo: nunca recibas mercancía sin guía de remisión. Si hay diferencias, anota "recibido con observaciones" en la guía antes de firmar.`,
  },

  // ─── DESPACHO ───
  {
    keywords: ["despacho", "picking", "como despachar", "preparar pedido", "empaque"],
    topic: "Proceso de Despacho",
    response: `Proceso de despacho (picking y packing):

1. Recibir la orden de despacho (del técnico o destino).

2. Picking: extraer los productos del inventario según la orden.
   • Verificar SKU y cantidad.
   • Para equipos con serie, escanear la serie correspondiente.
   • Aplicar FIFO: entregar primero los equipos más antiguos.

3. Packing: empaquetar los productos.
   • Proteger equipos frágiles.
   • Incluir la guía de remisión si es traslado entre almacenes.

4. Verificación: doble check de SKU, cantidad y series.

5. Registro: en VRS, registrar el despacho con /despachos. El sistema descuenta el stock automáticamente.

6. Firma: el destinatario firma la conformidad de recepción.

Tipos de despacho en VRS:
• Despacho a técnico: equipos para instalación en campo.
• Transferencia: traslado entre almacenes (ej: HUB a almacén secundario).
• Devolución: equipos que regresan del campo (cambiar estado a averiado o retiro).`,
  },

  // ─── EQUIPOS DE TELECOMUNICACIONES ───
  {
    keywords: ["router", "ont", "decodificador", "modem", "repetidor", "equipo telecom", "serie equipo"],
    topic: "Gestión de Equipos de Telecomunicaciones",
    response: `Gestión de equipos de telecomunicaciones en almacén:

Tipos de equipos:
• Router/ONT: equipo que da internet al cliente. Cada uno tiene número de serie único.
• Decodificador IPTV: equipo para TV. También con serie única.
• Repetidor WiFi: amplía la señal WiFi.

Estados de equipos en VRS:
• Disponible: en el almacén, listo para despachar.
• Averiado: no funciona, necesita reparación o baja.
• En retiro: fue cambiado por uno nuevo en la casa del cliente, regresó al almacén.

Control por serie:
Cada equipo tiene un número de serie único (generalmente en la etiqueta del fabricante). El control por serie permite:
• Trazabilidad: saber dónde está cada equipo y su historial.
• Garantía: verificar si el equipo está en garantía por su serie.
• Robo: detectar si un equipo reportado como robado aparece en el sistema.

En VRS: usa /pistolear para escanear series al recibir o devolver equipos. Usa /equipos para ver el estado de cada modelo. Usa /series para buscar una serie específica.

Consejo: cuando recibas un equipo devuelto (averiado o retiro), escanéalo con /pistolear y márcalo con el estado correcto para mantener el control.`,
  },

  // ─── JUST IN TIME ───
  {
    keywords: ["jit", "just in time", "justo a tiempo", "inventario cero"],
    topic: "Just In Time (JIT)",
    response: `Just In Time (JIT):

Filosofía de gestión donde recibes los productos exactamente cuando los necesitas, minimizando el inventario almacenado.

Ventajas:
• Menor costo de almacenamiento.
• Menos espacio necesario.
• Menos riesgo de obsolescencia.
• Mejor flujo de caja (no tienes capital inmovilizado en inventario).

Desventajas:
• Requiere proveedores muy confiables.
• Mayor riesgo de quiebres de stock si el proveedor falla.
• Necesita sistema de información robusto (como VRS).

¿Aplica a VRS?
Parcialmente. Para equipos de alto valor (routers, ONTs) que cuestan S/100-300, puedes aplicar JIT manteniendo stocks bajos. Para materiales de bajo valor (conectores, cables) es mejor mantener stock de seguridad porque el costo de almacenamiento es mínimo.

Consejo: usa el análisis ABC para decidir qué productos gestionar con JIT (Clase A) y cuáles con stock de seguridad (Clase C).`,
  },

  // ─── TÉRMINOS DE LOGÍSTICA ───
  {
    keywords: ["terminos logistica", "glosario", "que es sku", "que es lead time", "que es picking", "que es putaway"],
    topic: "Glosario de Logística",
    response: `Glosario de términos de logística y almacén:

• SKU (Stock Keeping Unit): código único que identifica un producto. En VRS es el campo "sku" de cada producto.
• Lead Time: tiempo desde que haces el pedido hasta que recibes la mercancía.
• Picking: proceso de extraer productos del inventario para preparar un despacho.
• Putaway: proceso de ubicar los productos recibidos en su lugar del almacén.
• Stockout: quiebre de stock, cuando un producto se agota y no puedes despachar.
• Backorder: pedido que no se pudo cumplir por falta de stock y queda pendiente.
• Drop shipping: enviar directamente del proveedor al cliente sin pasar por el almacén.
• Cross-docking: recibir mercancía y enviarla inmediatamente sin almacenarla.
• Cycle counting: conteo cíclico (ver Conteo Cíclico).
• Pallet: tarima de madera o plástico para almacenar y transportar mercancía.
• Lote/Número de lote: identifica un grupo de productos fabricados juntos.
• Caducidad: fecha límite para usar un producto (aplica a algunos materiales).
• Trazabilidad: capacidad de seguir el rastro de un producto desde origen hasta destino.
• Pick and pack: proceso combinado de extraer y empaquetar para envío.`,
  },

  // ─── MEJORES PRÁCTICAS ───
  {
    keywords: ["mejores practicas", "buenas practicas", "consejos almacen", "recomendaciones", "tips almacen"],
    topic: "Mejores Prácticas de Almacén",
    response: `Mejores prácticas de gestión de almacén:

1. Organización física:
   • Define zonas claras: recepción, almacenamiento, despacho, devoluciones, averiados.
   • Etiqueta estantes y ubicaciones.
   • Mantén pasillos despejados.

2. Control de inventario:
   • Haz conteos cíclicos semanales para Clase A.
   • Mantén el stock de seguridad actualizado.
   • Revisa puntos de reorden mensualmente.
   • Usa el campo "ubicación" de VRS para saber dónde está cada equipo.

3. Recepción:
   • Siempre verifica la guía de remisión SUNAT.
   • Cuenta físicamente, no confíes en lo que dice el papel.
   • Escanea series de equipos con /pistolear.

4. Despacho:
   • Aplica FIFO (entrega primero lo más antiguo).
   • Doble verificación de SKU y cantidad.
   • Registra el despacho en VRS para mantener el stock exacto.

5. Gestión de devoluciones:
   • Clasifica el equipo: averiado vs retiro.
   • Escanea la serie con /pistolear.
   • Asigna ubicación: Taller para averiados, Bodega de Retiro para retiros.

6. Tecnología:
   • Usa un lector de código de barras para pistolear.
   • Mantén el sistema actualizado (VRS sincroniza entre dispositivos).
   • Revisa las alertas de bajo stock diariamente.`,
  },
];

/**
 * Busca la entrada de conocimiento más relevante para el mensaje del usuario.
 * Devuelve la respuesta de conocimiento si encuentra una coincidencia, o null si no.
 */
export function buscarConocimiento(mensaje: string): string | null {
  const msg = mensaje.toLowerCase().trim();

  // Buscar la entrada con más coincidencias de keywords
  let mejorMatch: KnowledgeEntry | null = null;
  let mejorScore = 0;

  for (const entry of WAREHOUSE_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (msg.includes(kw.toLowerCase())) {
        score += kw.length; // keywords más largas valen más
      }
    }
    if (score > mejorScore) {
      mejorScore = score;
      mejorMatch = entry;
    }
  }

  // Solo devolver si hay un match significativo
  if (mejorMatch && mejorScore > 0) {
    return mejorMatch.response;
  }

  return null;
}
