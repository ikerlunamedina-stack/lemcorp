// Motor de fórmulas tipo Excel para Nuclon
// Soporta: referencias A1, rangos A1:B10, SUMA, SI, PROMEDIO, MAX, MIN,
// CONTAR, CONTARA, REDONDEAR, ABS, HOY, CONCATENAR, SI.ERROR,
// aritmética + - * / ^ %, comparaciones, paréntesis, texto "..." y números.

import type { SheetFile } from "./types";

const LETTER_RE = /^[A-Z]+$/;

export function columnToLetter(n: number): string {
  // 0 -> "A", 25 -> "Z", 26 -> "AA"
  let s = "";
  n = n + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToColumn(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): { row: number; col: number } {
  const [r, c] = key.split(",").map(Number);
  return { row: r, col: c };
}

export function refToCoord(ref: string): { row: number; col: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.trim().toUpperCase());
  if (!m) return null;
  return {
    col: letterToColumn(m[1]),
    row: parseInt(m[2], 10) - 1, // Excel row 1 -> our row 0
  };
}

export function coordToRef(row: number, col: number): string {
  return `${columnToLetter(col)}${row + 1}`;
}

// ---------- Tokenizer ----------

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; v: string }
  | { t: "ident"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" }
  | { t: "colon" };

function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let buf = "";
      while (j < s.length && s[j] !== '"') {
        buf += s[j];
        j++;
      }
      toks.push({ t: "str", v: buf });
      i = j + 1;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lp" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rp" });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ t: "comma" });
      i++;
      continue;
    }
    if (c === ":") {
      toks.push({ t: "colon" });
      i++;
      continue;
    }
    // numbers (incluye decimales y notación con coma -> normalizamos a punto)
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] || ""))) {
      let j = i;
      let buf = "";
      while (j < s.length && /[0-9.]/.test(s[j])) {
        buf += s[j];
        j++;
      }
      toks.push({ t: "num", v: parseFloat(buf) });
      i = j;
      continue;
    }
    // operadores de 2 o 1 carácter
    const two = s.slice(i, i + 2);
    if (["<>", ">=", "<=", "=="].includes(two)) {
      toks.push({ t: "op", v: two === "<>" ? "!=" : two });
      i += 2;
      continue;
    }
    if ("+-*/^%<>=&".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    // referencias de celda o identificadores (letras, números, _)
    if (/[A-Za-z_ÁÉÍÓÚÜÑáéíóúüñ]/.test(c)) {
      let j = i;
      let buf = "";
      while (
        j < s.length &&
        /[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ.]/.test(s[j])
      ) {
        buf += s[j];
        j++;
      }
      const up = buf.toUpperCase();
      if (/^[A-Z]+\d+$/.test(up)) {
        toks.push({ t: "ref", v: up });
      } else {
        toks.push({ t: "ident", v: up });
      }
      i = j;
      continue;
    }
    // carácter desconocido -> saltar
    i++;
  }
  return toks;
}

// ---------- AST ----------

type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "ref"; row: number; col: number }
  | { k: "range"; r1: number; c1: number; r2: number; c2: number }
  | { k: "unary"; op: string; e: Node }
  | { k: "bin"; op: string; l: Node; r: Node }
  | { k: "call"; name: string; args: Node[] };

class Parser {
  toks: Tok[];
  pos = 0;
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  next(): Tok | undefined {
    return this.toks[this.pos++];
  }
  parse(): Node {
    const e = this.parseExpr();
    return e;
  }
  parseExpr(): Node {
    return this.parseCompare();
  }
  parseCompare(): Node {
    let left = this.parseConcat();
    while (this.peek() && this.peek()!.t === "op" && ["<", ">", "<=", ">=", "=", "!="].includes((this.peek() as any).v)) {
      const op = (this.next() as any).v;
      const right = this.parseConcat();
      left = { k: "bin", op: op === "=" ? "==" : op, l: left, r: right };
    }
    return left;
  }
  parseConcat(): Node {
    let left = this.parseAdd();
    while (this.peek() && this.peek()!.t === "op" && (this.peek() as any).v === "&") {
      this.next();
      const right = this.parseAdd();
      left = { k: "bin", op: "&", l: left, r: right };
    }
    return left;
  }
  parseAdd(): Node {
    let left = this.parseMul();
    while (this.peek() && this.peek()!.t === "op" && ["+", "-"].includes((this.peek() as any).v)) {
      const op = (this.next() as any).v;
      const right = this.parseMul();
      left = { k: "bin", op, l: left, r: right };
    }
    return left;
  }
  parseMul(): Node {
    let left = this.parsePow();
    while (this.peek() && this.peek()!.t === "op" && ["*", "/", "%"].includes((this.peek() as any).v)) {
      const op = (this.next() as any).v;
      const right = this.parsePow();
      left = { k: "bin", op, l: left, r: right };
    }
    return left;
  }
  parsePow(): Node {
    let left = this.parseUnary();
    while (this.peek() && this.peek()!.t === "op" && (this.peek() as any).v === "^") {
      this.next();
      const right = this.parseUnary();
      left = { k: "bin", op: "^", l: left, r: right };
    }
    return left;
  }
  parseUnary(): Node {
    if (this.peek() && this.peek()!.t === "op" && (this.peek() as any).v === "-") {
      this.next();
      return { k: "unary", op: "-", e: this.parseUnary() };
    }
    if (this.peek() && this.peek()!.t === "op" && (this.peek() as any).v === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }
  parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new Error("Expresión incompleta");
    if (t.t === "num") {
      this.next();
      return { k: "num", v: t.v };
    }
    if (t.t === "str") {
      this.next();
      return { k: "str", v: t.v };
    }
    if (t.t === "ref") {
      this.next();
      const c = refToCoord(t.v)!;
      // range?
      if (this.peek() && this.peek()!.t === "colon") {
        this.next();
        const t2 = this.next();
        if (!t2 || t2.t !== "ref") throw new Error("Rango inválido");
        const c2 = refToCoord(t2.v)!;
        return {
          k: "range",
          r1: Math.min(c.row, c2.row),
          c1: Math.min(c.col, c2.col),
          r2: Math.max(c.row, c2.row),
          c2: Math.max(c.col, c2.col),
        };
      }
      return { k: "ref", row: c.row, col: c.col };
    }
    if (t.t === "ident") {
      this.next();
      if (this.peek() && this.peek()!.t === "lp") {
        this.next();
        const args: Node[] = [];
        if (this.peek() && this.peek()!.t !== "rp") {
          args.push(this.parseExpr());
          while (this.peek() && this.peek()!.t === "comma") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        if (!this.peek() || this.peek()!.t !== "rp") throw new Error("Paréntesis no cerrado");
        this.next();
        return { k: "call", name: t.v, args };
      }
      // constante simbólica
      if (t.v === "VERDADERO") return { k: "num", v: 1 };
      if (t.v === "FALSO") return { k: "num", v: 0 };
      throw new Error(`Identificador desconocido: ${t.v}`);
    }
    if (t.t === "lp") {
      this.next();
      const e = this.parseExpr();
      if (!this.peek() || this.peek()!.t !== "rp") throw new Error("Paréntesis no cerrado");
      this.next();
      return e;
    }
    throw new Error("Token inesperado");
  }
}

// ---------- Evaluator ----------

export interface EvalCtx {
  file: SheetFile;
  computed: Record<string, string>; // display values ya calculados
  visiting: Set<string>; // detección de referencias circulares
}

function num(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function bool(v: any): boolean {
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.toLowerCase() === "verdadero" || v === "true";
  return !!v;
}

// Obtiene valor de una celda (sin formatear)
function cellRaw(ctx: EvalCtx, row: number, col: number): string {
  if (row < 0 || col < 0) return "";
  return ctx.file.cells[cellKey(row, col)] ?? "";
}

function cellValue(ctx: EvalCtx, row: number, col: number): any {
  const raw = cellRaw(ctx, row, col);
  if (raw.startsWith("=")) {
    // fórmula -> usar computed si existe, sino calcular
    const ck = cellKey(row, col);
    if (ctx.computed[ck] !== undefined) return ctx.computed[ck];
    if (ctx.visiting.has(ck)) return 0; // circular
    return computeFormula(raw.slice(1), ctx, row, col);
  }
  return raw;
}

function flattenRange(ctx: EvalCtx, r1: number, c1: number, r2: number, c2: number): any[] {
  const out: any[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      out.push(cellValue(ctx, r, c));
    }
  }
  return out;
}

function evalNode(node: Node, ctx: EvalCtx): any {
  switch (node.k) {
    case "num":
      return node.v;
    case "str":
      return node.v;
    case "ref":
      return cellValue(ctx, node.row, node.col);
    case "range":
      return flattenRange(ctx, node.r1, node.c1, node.r2, node.c2);
    case "unary": {
      const v = evalNode(node.e, ctx);
      return -num(v);
    }
    case "bin": {
      const l = evalNode(node.l, ctx);
      const r = evalNode(node.r, ctx);
      switch (node.op) {
        case "+":
          return num(l) + num(r);
        case "-":
          return num(l) - num(r);
        case "*":
          return num(l) * num(r);
        case "/":
          return num(r) === 0 ? 0 : num(l) / num(r);
        case "%":
          return num(l) % num(r);
        case "^":
          return Math.pow(num(l), num(r));
        case "&":
          return str(l) + str(r);
        case "==":
          return num(l) === num(r) || str(l) === str(r) ? 1 : 0;
        case "!=":
          return num(l) !== num(r) || str(l) !== str(r) ? 1 : 0;
        case "<":
          return num(l) < num(r) ? 1 : 0;
        case ">":
          return num(l) > num(r) ? 1 : 0;
        case "<=":
          return num(l) <= num(r) ? 1 : 0;
        case ">=":
          return num(l) >= num(r) ? 1 : 0;
      }
      return 0;
    }
    case "call": {
      const args = node.args;
      const ev = (a: Node) => evalNode(a, ctx);
      const evArr = (a: Node): any[] => {
        const v = ev(a);
        return Array.isArray(v) ? v : [v];
      };
      switch (node.name) {
        case "SUMA":
        case "SUM": {
          let total = 0;
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) {
              for (const x of v) total += num(x);
            } else total += num(v);
          }
          return total;
        }
        case "PROMEDIO":
        case "AVERAGE": {
          let total = 0;
          let count = 0;
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) {
              for (const x of v) {
                if (x !== "" && x !== null && x !== undefined) {
                  total += num(x);
                  count++;
                }
              }
            } else if (v !== "" && v !== null && v !== undefined) {
              total += num(v);
              count++;
            }
          }
          return count === 0 ? 0 : total / count;
        }
        case "MAX":
        case "MAXIMO": {
          let m = -Infinity;
          const consider = (x: any) => {
            if (x !== "" && x !== null && x !== undefined) {
              const n = num(x);
              if (n > m) m = n;
            }
          };
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) v.forEach(consider);
            else consider(v);
          }
          return m === -Infinity ? 0 : m;
        }
        case "MIN":
        case "MINIMO": {
          let m = Infinity;
          const consider = (x: any) => {
            if (x !== "" && x !== null && x !== undefined) {
              const n = num(x);
              if (n < m) m = n;
            }
          };
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) v.forEach(consider);
            else consider(v);
          }
          return m === Infinity ? 0 : m;
        }
        case "CONTAR":
        case "COUNT": {
          let count = 0;
          const consider = (x: any) => {
            if (x !== "" && x !== null && x !== undefined && !isNaN(num(x))) count++;
          };
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) v.forEach(consider);
            else consider(v);
          }
          return count;
        }
        case "CONTARA":
        case "COUNTA": {
          let count = 0;
          const consider = (x: any) => {
            if (x !== "" && x !== null && x !== undefined) count++;
          };
          for (const a of args) {
            const v = ev(a);
            if (Array.isArray(v)) v.forEach(consider);
            else consider(v);
          }
          return count;
        }
        case "SI":
        case "IF": {
          const cond = ev(args[0]);
          if (bool(cond)) return ev(args[1]);
          return args[2] !== undefined ? ev(args[2]) : 0;
        }
        case "REDONDEAR":
        case "ROUND": {
          const v = num(ev(args[0]));
          const d = args[1] !== undefined ? num(ev(args[1])) : 0;
          const f = Math.pow(10, d);
          return Math.round(v * f) / f;
        }
        case "ABS": {
          return Math.abs(num(ev(args[0])));
        }
        case "ENTERO":
        case "INT": {
          return Math.floor(num(ev(args[0])));
        }
        case "RAIZ":
        case "SQRT": {
          return Math.sqrt(num(ev(args[0])));
        }
        case "HOY":
        case "TODAY": {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        case "AHORA":
        case "NOW": {
          return new Date().toLocaleString("es-PE");
        }
        case "CONCATENAR":
        case "CONCAT": {
          let out = "";
          for (const a of args) out += str(ev(a));
          return out;
        }
        case "IZQUIERDA":
        case "LEFT": {
          const s = str(ev(args[0]));
          const n = args[1] !== undefined ? num(ev(args[1])) : 1;
          return s.slice(0, n);
        }
        case "DERECHA":
        case "RIGHT": {
          const s = str(ev(args[0]));
          const n = args[1] !== undefined ? num(ev(args[1])) : 1;
          return s.slice(s.length - n);
        }
        case "LARGO":
        case "LEN": {
          return str(ev(args[0])).length;
        }
        case "MAYUSC":
        case "UPPER": {
          return str(ev(args[0])).toUpperCase();
        }
        case "MINUSC":
        case "LOWER": {
          return str(ev(args[0])).toLowerCase();
        }
        case "SI.ERROR":
        case "IFERROR": {
          try {
            const v = ev(args[0]);
            if (v === null || v === undefined || v === "" ) return ev(args[1]);
            return v;
          } catch {
            return ev(args[1]);
          }
        }
        case "ESBLANCO":
        case "ISBLANK": {
          return str(ev(args[0])) === "" ? 1 : 0;
        }
        case "BUSCARV":
        case "VLOOKUP": {
          const lookup = ev(args[0]);
          const range = args[1];
          if (range.k !== "range") return "#REF!";
          const colIdx = num(ev(args[2])) - 1;
          const approx = args[3] !== undefined ? bool(ev(args[3])) : false;
          for (let r = range.r1; r <= range.r2; r++) {
            const v = cellValue(ctx, r, range.c1);
            if (str(v) === str(lookup)) {
              return cellValue(ctx, r, range.c1 + colIdx);
            }
            if (approx && num(v) > num(lookup)) break;
          }
          return "#N/D";
        }
        case "CONTAR.SI":
        case "COUNTIF": {
          const range = evArr(args[0]);
          const crit = str(ev(args[1]));
          let count = 0;
          for (const v of range) {
            if (str(v) === crit) count++;
          }
          return count;
        }
        case "SUMAR.SI":
        case "SUMIF": {
          const range = evArr(args[0]);
          const crit = str(ev(args[1]));
          const sumRange = args[2] !== undefined ? evArr(args[2]) : range;
          let total = 0;
          for (let i = 0; i < range.length; i++) {
            if (str(range[i]) === crit) total += num(sumRange[i]);
          }
          return total;
        }
      }
      throw new Error(`Función no soportada: ${node.name}`);
    }
  }
  return 0;
}

export function computeFormula(
  formula: string,
  ctx: EvalCtx,
  row: number,
  col: number
): any {
  const ck = cellKey(row, col);
  ctx.visiting.add(ck);
  try {
    const toks = tokenize(formula);
    const ast = new Parser(toks).parse();
    return evalNode(ast, ctx);
  } catch (e) {
    return "#ERROR";
  } finally {
    ctx.visiting.delete(ck);
  }
}

// Recalcula todas las celdas de un archivo y devuelve mapa de valores display.
// Para fórmulas con referencias entre hojas (que contienen \u0001 + valor precalculado),
// usa el valor precalculado en vez de intentar resolver la referencia.
export function recalcFile(file: SheetFile): Record<string, string> {
  const ctx: EvalCtx = {
    file,
    computed: {},
    visiting: new Set(),
  };
  const out: Record<string, string> = {};
  const formulaKeys = Object.keys(file.cells).filter((k) =>
    file.cells[k].startsWith("=")
  );
  for (let pass = 0; pass < 3; pass++) {
    for (const k of formulaKeys) {
      const { row, col } = parseCellKey(k);
      const raw = file.cells[k];
      // Si la fórmula tiene valor precalculado (separador \u0001), usarlo.
      const sepIdx = raw.indexOf("\u0001");
      if (sepIdx >= 0) {
        const preVal = raw.slice(sepIdx + 1);
        ctx.computed[k] = preVal;
        out[k] = preVal;
        continue;
      }
      const formulaBody = sepIdx >= 0 ? raw.slice(1, sepIdx) : raw.slice(1);
      // Si la fórmula referencia otra hoja (!), no podemos resolverla; usar ""
      if (formulaBody.includes("!")) {
        ctx.computed[k] = "";
        out[k] = "";
        continue;
      }
      const v = computeFormula(formulaBody, ctx, row, col);
      ctx.computed[k] = formatVal(v);
      out[k] = formatVal(v);
    }
  }
  return out;
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (isNaN(v)) return "#ERROR";
    if (!isFinite(v)) return "#DIV/0!";
    // redondeo para evitar 0.1+0.2 = 0.30000000004
    const r = Math.round(v * 1e10) / 1e10;
    if (Number.isInteger(r)) return String(r);
    return String(r);
  }
  return String(v);
}

// Devuelve el valor display de una celda (calcula si es fórmula).
// Para fórmulas con referencias entre hojas, usa el valor precalculado.
export function displayValue(
  file: SheetFile,
  row: number,
  col: number,
  computed?: Record<string, string>
): string {
  const raw = file.cells[cellKey(row, col)] ?? "";
  if (!raw.startsWith("=")) return raw;
  // Si la fórmula tiene valor precalculado (separador \u0001), usarlo.
  const sepIdx = raw.indexOf("\u0001");
  if (sepIdx >= 0) {
    return raw.slice(sepIdx + 1);
  }
  // Si la fórmula referencia otra hoja (!), no podemos resolverla; usar "".
  const formulaBody = raw.slice(1);
  if (formulaBody.includes("!")) return "";
  if (computed && computed[cellKey(row, col)] !== undefined) {
    return computed[cellKey(row, col)];
  }
  const ctx: EvalCtx = {
    file,
    computed: computed ?? {},
    visiting: new Set(),
  };
  const v = computeFormula(formulaBody, ctx, row, col);
  return formatVal(v);
}
