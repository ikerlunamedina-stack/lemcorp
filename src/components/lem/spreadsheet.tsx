"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useEditorUI, isInRange } from "@/lib/editor-store";
import { recalcFile, columnToLetter, coordToRef } from "@/lib/formulas";
import { cn } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  CustomContextMenu,
  MenuIcons,
  type MenuItem,
} from "./custom-context-menu";
import { FormatToolbar } from "./format-toolbar";
import { useToast } from "@/hooks/use-toast";

const COL_W = 120;
const ROW_H = 30;
const HEADER_H = 30;
const ROW_NUM_W = 48;

export function SpreadsheetView() {
  const file = useStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const settings = useStore((s) => s.settings);
  const setCell = useStore((s) => s.setCell);
  const setCells = useStore((s) => s.setCells);
  const addRow = useStore((s) => s.addRow);
  const deleteRow = useStore((s) => s.deleteRow);
  const addColumn = useStore((s) => s.addColumn);
  const deleteColumn = useStore((s) => s.deleteColumn);
  const fillSeries = useStore((s) => s.fillSeries);
  const clearRange = useStore((s) => s.clearRange);
  const setColWidth = useStore((s) => s.setColWidth);
  const setRowHeight = useStore((s) => s.setRowHeight);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setActiveView = useStore((s) => s.setActiveView);
  const createFile = useStore((s) => s.createFile);
  const { toast } = useToast();

  const active = useEditorUI((s) => s.active);
  const setActive = useEditorUI((s) => s.setActive);
  const clearActive = useEditorUI((s) => s.clearActive);
  const editing = useEditorUI((s) => s.editing);
  const editValue = useEditorUI((s) => s.editValue);
  const startEdit = useEditorUI((s) => s.startEdit);
  const setEditValueUI = useEditorUI((s) => s.setEditValue);
  const commitEdit = useEditorUI((s) => s.commitEdit);
  const cancelEdit = useEditorUI((s) => s.cancelEdit);
  const range = useEditorUI((s) => s.range);
  const selecting = useEditorUI((s) => s.selecting);
  const setRange = useEditorUI((s) => s.setRange);
  const startRange = useEditorUI((s) => s.startRange);
  const extendRange = useEditorUI((s) => s.extendRange);
  const endRange = useEditorUI((s) => s.endRange);

  const gridRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  // portapapeles interno (una sola celda por ahora)
  const clipboardRef = useRef<string | null>(null);

  // helpers de dimensiones (con override por columna/fila)
  const colWidth = useCallback(
    (c: number) => file?.colWidths?.[c] ?? COL_W,
    [file]
  );
  const rowHeight = useCallback(
    (r: number) => file?.rowHeights?.[r] ?? ROW_H,
    [file]
  );
  const totalColWidth = useMemo(() => {
    if (!file) return 0;
    let w = 0;
    for (let c = 0; c < file.colCount; c++) w += colWidth(c);
    return w;
  }, [file, colWidth]);
  const totalRowHeight = useMemo(() => {
    if (!file) return 0;
    let h = 0;
    for (let r = 0; r < file.rowCount; r++) h += rowHeight(r);
    return h;
  }, [file, rowHeight]);

  // valores calculados (memo por contenido del archivo)
  const computed = useMemo(() => {
    if (!file) return {};
    return recalcFile(file);
  }, [file]);

  // detección de duplicados: mapa de valores -> conteo
  const dupSet = useMemo(() => {
    const set = new Set<string>();
    if (!file || !settings.highlightDuplicates) return set;
    const counts = new Map<string, number>();
    for (const k of Object.keys(file.cells)) {
      const v = (file.cells[k] ?? "").trim();
      if (!v || v.startsWith("=")) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (const [v, n] of counts) {
      if (n > 1) set.add(v);
    }
    return set;
  }, [file, settings.highlightDuplicates]);
  const highlightDup = settings.highlightDuplicates;

  // reset celda activa al cambiar de archivo
  useEffect(() => {
    clearActive();
  }, [file?.id, clearActive]);

  // foco al input de edición
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      const len = editRef.current.value.length;
      editRef.current.setSelectionRange(len, len);
    }
  }, [editing, active]);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (!file || !active) return;
      const nr = Math.max(0, Math.min(file.rowCount - 1, active.row + dr));
      const nc = Math.max(0, Math.min(file.colCount - 1, active.col + dc));
      setActive(nr, nc);
      // scroll into view
      const cell = gridRef.current?.querySelector(
        `[data-cell="${nr},${nc}"]`
      ) as HTMLElement | null;
      cell?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [file, active, setActive]
  );

  const commit = useCallback(() => {
    const st = useEditorUI.getState();
    if (!file || !st.editing || !st.editCell) return; // guarda contra doble commit
    setCell(file.id, st.editCell.row, st.editCell.col, st.editValue);
    commitEdit();
  }, [file, setCell, commitEdit]);

  // atajos de teclado globales del editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!file) return;
      // no interferir si el foco está en un input externo (formula bar, sidebar)
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      // Ctrl+Z / Ctrl+Y siempre
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo(file.id);
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        redo(file.id);
        return;
      }
      if (inInput && !editing) return; // deja escribir en formula bar etc.
      if (!active) return;

      if (editing) {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          move(1, 0);
        } else if (e.key === "Tab") {
          e.preventDefault();
          commit();
          move(0, e.shiftKey ? -1 : 1);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      // no editando
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        const raw = file.cells[`${active.row},${active.col}`] ?? "";
        startEdit(raw);
      } else if (e.key === "Tab") {
        e.preventDefault();
        move(0, e.shiftKey ? -1 : 1);
      } else if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === "ArrowUp") move(-1, 0);
        if (e.key === "ArrowDown") move(1, 0);
        if (e.key === "ArrowLeft") move(0, -1);
        if (e.key === "ArrowRight") move(0, 1);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setCell(file.id, active.row, active.col, "");
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // empezar a escribir reemplazando
        startEdit(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [file, active, editing, editValue, move, commit, startEdit, cancelEdit, setCell, undo, redo]);

  // Construye el menú contextual para una celda dada.
  const buildCellMenu = useCallback(
    (r: number, c: number): MenuItem[] => {
      if (!file) return [];
      const ref = coordToRef(r, c);
      const raw = file.cells[`${r},${c}`] ?? "";
      const hasValue = raw !== "";
      const isFormula = raw.startsWith("=");
      const inHeader = r === 0;

      const formulaItems: MenuItem[] = [
        {
          label: `SUMA hasta esta celda`,
          icon: <MenuIcons.Sigma className="h-3.5 w-3.5" />,
          onClick: () => {
            // =SUMA(col1:col_actual) en la fila actual
            const colLetter = columnToLetter(c);
            setCell(file.id, r, c, `=SUMA(${colLetter}1:${colLetter}${r})`);
            toast({ title: "Fórmula insertada", description: `=SUMA(${colLetter}1:${colLetter}${r})` });
          },
        },
        {
          label: "SUMA de toda la columna",
          icon: <MenuIcons.Sigma className="h-3.5 w-3.5" />,
          onClick: () => {
            const colLetter = columnToLetter(c);
            const formula = `=SUMA(${colLetter}1:${colLetter}${file.rowCount})`;
            setCell(file.id, r, c, formula);
            toast({ title: "Fórmula insertada", description: formula });
          },
        },
        { type: "separator" },
        {
          label: "PROMEDIO de la columna",
          icon: <MenuIcons.TrendingUp className="h-3.5 w-3.5" />,
          onClick: () => {
            const colLetter = columnToLetter(c);
            setCell(file.id, r, c, `=PROMEDIO(${colLetter}1:${colLetter}${file.rowCount})`);
          },
        },
        {
          label: "MAX de la columna",
          onClick: () => {
            const colLetter = columnToLetter(c);
            setCell(file.id, r, c, `=MAX(${colLetter}1:${colLetter}${file.rowCount})`);
          },
        },
        {
          label: "MIN de la columna",
          onClick: () => {
            const colLetter = columnToLetter(c);
            setCell(file.id, r, c, `=MIN(${colLetter}1:${colLetter}${file.rowCount})`);
          },
        },
        {
          label: "CONTAR no vacías",
          icon: <MenuIcons.Hash className="h-3.5 w-3.5" />,
          onClick: () => {
            const colLetter = columnToLetter(c);
            setCell(file.id, r, c, `=CONTARA(${colLetter}1:${colLetter}${file.rowCount})`);
          },
        },
        { type: "separator" },
        {
          label: "SI (condicional)",
          icon: <MenuIcons.Split className="h-3.5 w-3.5" />,
          onClick: () => {
            setCell(file.id, r, c, `=SI(${coordToRef(r, c - 1)}>0;"Sí";"No")`);
            toast({ title: "Fórmula SI insertada", description: "Edita la condición en la barra fx" });
          },
        },
        {
          label: "HOY (fecha actual)",
          icon: <MenuIcons.Calendar className="h-3.5 w-3.5" />,
          onClick: () => {
            setCell(file.id, r, c, "=HOY()");
          },
        },
      ];

      const items: MenuItem[] = [
        {
          label: "Copiar",
          icon: <MenuIcons.Copy className="h-3.5 w-3.5" />,
          shortcut: "Ctrl+C",
          disabled: !hasValue,
          onClick: async () => {
            clipboardRef.current = raw;
            try {
              await navigator.clipboard.writeText(raw);
            } catch {}
            toast({ title: "Copiado", description: ref });
          },
        },
        {
          label: "Pegar",
          icon: <MenuIcons.ClipboardPaste className="h-3.5 w-3.5" />,
          shortcut: "Ctrl+V",
          disabled: clipboardRef.current === null,
          onClick: async () => {
            let val = clipboardRef.current ?? "";
            try {
              const text = await navigator.clipboard.readText();
              if (text) val = text;
            } catch {}
            if (val) {
              // pegar como valor (sin formato)
              const clean = val.replace(/^=/, "");
              setCell(file.id, r, c, clean);
              toast({ title: "Pegado en valores", description: ref });
            }
          },
        },
        {
          type: "submenu",
          label: "Pegado especial",
          icon: <MenuIcons.ClipboardPaste className="h-3.5 w-3.5" />,
          disabled: clipboardRef.current === null,
          children: [
            {
              label: "Pegar valores (sin formato)",
              onClick: async () => {
                let val = clipboardRef.current ?? "";
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) val = text;
                } catch {}
                if (val) {
                  // quitar fórmulas, pegar solo el texto plano
                  const clean = val.replace(/^=/, "");
                  setCell(file.id, r, c, clean);
                  toast({ title: "Pegado en valores", description: ref });
                }
              },
            },
            {
              label: "Pegar como fórmula",
              onClick: async () => {
                let val = clipboardRef.current ?? "";
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) val = text;
                } catch {}
                if (val) {
                  if (!val.startsWith("=")) val = "=" + val;
                  setCell(file.id, r, c, val);
                  toast({ title: "Pegado como fórmula", description: ref });
                }
              },
            },
          ],
        },
        {
          label: "Cortar",
          icon: <MenuIcons.Scissors className="h-3.5 w-3.5" />,
          shortcut: "Ctrl+X",
          disabled: !hasValue,
          onClick: async () => {
            clipboardRef.current = raw;
            try {
              await navigator.clipboard.writeText(raw);
            } catch {}
            setCell(file.id, r, c, "");
            toast({ title: "Cortado", description: ref });
          },
        },
        { type: "separator" },
        {
          label: "Editar celda",
          icon: <MenuIcons.Type className="h-3.5 w-3.5" />,
          shortcut: "Enter",
          onClick: () => {
            setActive(r, c);
            startEdit(raw);
          },
        },
        {
          label: "Borrar contenido",
          icon: <MenuIcons.Eraser className="h-3.5 w-3.5" />,
          shortcut: "Supr",
          disabled: !hasValue,
          onClick: () => setCell(file.id, r, c, ""),
        },
        { type: "separator" },
        {
          label: "Rellenar hacia abajo",
          icon: <MenuIcons.ArrowDownToLine className="h-3.5 w-3.5" />,
          disabled: !hasValue || r >= file.rowCount - 1,
          onClick: () => {
            fillSeries(file.id, r, c, Math.min(r + 10, file.rowCount - 1));
            toast({ title: "Serie rellenada", description: `Hasta fila ${Math.min(r + 10, file.rowCount - 1) + 1}` });
          },
        },
        { type: "separator" },
        {
          type: "submenu",
          label: "Formato",
          icon: <MenuIcons.Type className="h-3.5 w-3.5" />,
          children: [
            {
              label: "Negrita",
              icon: <MenuIcons.Copy className="h-3.5 w-3.5" />,
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { bold: true });
              },
            },
            {
              label: "Cursiva",
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { italic: true });
              },
            },
            { type: "separator" },
            {
              label: "Fondo amarillo",
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { bg: "#fef3c7" });
              },
            },
            {
              label: "Fondo verde",
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { bg: "#bbf7d0" });
              },
            },
            {
              label: "Fondo rojo",
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { bg: "#fecaca" });
              },
            },
            {
              label: "Fondo gris oscuro",
              onClick: () => {
                useStore.getState().setCellStyle(file.id, [{ row: r, col: c }], { bg: "#1f2937", color: "#ffffff" });
              },
            },
            { type: "separator" },
            {
              label: "Quitar formato",
              icon: <MenuIcons.Eraser className="h-3.5 w-3.5" />,
              onClick: () => {
                useStore.getState().clearCellStyle(file.id, [{ row: r, col: c }]);
              },
            },
          ],
        },
        { type: "separator" },
        {
          type: "submenu",
          label: "Insertar fórmula",
          icon: <MenuIcons.Sigma className="h-3.5 w-3.5" />,
          children: formulaItems,
        },
        { type: "separator" },
        {
          type: "submenu",
          label: "Fila",
          icon: <MenuIcons.Plus className="h-3.5 w-3.5" />,
          children: [
            {
              label: "Insertar fila arriba",
              icon: <MenuIcons.ArrowUpToLine className="h-3.5 w-3.5" />,
              onClick: () => addRow(file.id, r),
            },
            {
              label: "Insertar fila abajo",
              icon: <MenuIcons.ArrowDownToLine className="h-3.5 w-3.5" />,
              onClick: () => addRow(file.id, r + 1),
            },
            { type: "separator" },
            {
              label: `Eliminar fila ${r + 1}`,
              icon: <MenuIcons.Trash2 className="h-3.5 w-3.5" />,
              disabled: r === 0,
              onClick: () => deleteRow(file.id, r),
            },
          ],
        },
        {
          type: "submenu",
          label: "Columna",
          icon: <MenuIcons.Plus className="h-3.5 w-3.5" />,
          children: [
            {
              label: "Insertar columna antes",
              icon: <MenuIcons.ArrowLeftToLine className="h-3.5 w-3.5" />,
              onClick: () => addColumn(file.id),
            },
            { type: "separator" },
            {
              label: `Eliminar columna ${columnToLetter(c)}`,
              icon: <MenuIcons.Trash2 className="h-3.5 w-3.5" />,
              onClick: () => deleteColumn(file.id, c),
            },
          ],
        },
      ];

      if (inHeader) {
        // menú simplificado para fila de encabezados
        return [
          {
            label: "Agregar columna",
            icon: <MenuIcons.Plus className="h-3.5 w-3.5" />,
            onClick: () => addColumn(file.id),
          },
          {
            label: `Eliminar columna ${columnToLetter(c)}`,
            icon: <MenuIcons.Trash2 className="h-3.5 w-3.5" />,
            onClick: () => deleteColumn(file.id, c),
          },
        ];
      }

      return items;
    },
    [file, setCell, addRow, addColumn, deleteRow, deleteColumn, fillSeries, setActive, startEdit, toast]
  );

  const openCellMenu = useCallback(
    (e: React.MouseEvent, r: number, c: number) => {
      e.preventDefault();
      setActive(r, c);
      setCtxMenu({ x: e.clientX, y: e.clientY, items: buildCellMenu(r, c) });
    },
    [buildCellMenu, setActive]
  );

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Sin archivo abierto</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Selecciona un archivo del panel lateral, crea uno nuevo o ve al
            resumen general para empezar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => createFile("Nuevo archivo", "inventario")}
            className="press rounded-xl"
          >
            Crear archivo
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveView("resumen")}
            className="press rounded-xl"
          >
            Ver resumen
          </Button>
        </div>
      </div>
    );
  }

  const displayFor = (r: number, c: number) => {
    const raw = file.cells[`${r},${c}`] ?? "";
    if (raw.startsWith("=")) return computed[`${r},${c}`] ?? "";
    return raw;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Barra de columnas con menú desplegable */}
      <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2">
        <span className="text-[11px] text-muted-foreground">
          {file.rowCount} filas · {file.colCount} columnas
        </span>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="press h-7 gap-1 rounded-lg text-xs">
                Filas <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => addRow(file.id)}>
                Agregar fila al final
              </DropdownMenuItem>
              {active && (
                <DropdownMenuItem
                  onClick={() => {
                    addRow(file.id, active.row);
                  }}
                >
                  Insertar fila arriba
                </DropdownMenuItem>
              )}
              {active && active.row > 0 && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteRow(file.id, active.row)}
                >
                  Eliminar fila {active.row + 1}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="press h-7 gap-1 rounded-lg text-xs">
                Columnas <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => addColumn(file.id)}>
                Agregar columna
              </DropdownMenuItem>
              {active && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteColumn(file.id, active.col)}
                >
                  Eliminar columna {columnToLetter(active.col)}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Barra de formato (tipo Excel) */}
      <FormatToolbar />

      {/* Grilla */}
      <div
        ref={gridRef}
        className="relative flex-1 overflow-auto scroll-thin bg-background"
        onMouseUp={() => endRange()}
      >
        <div
          className="relative"
          style={{
            minWidth: ROW_NUM_W + totalColWidth,
            minHeight: HEADER_H + totalRowHeight,
          }}
        >
          {/* Esquina */}
          <div
            className="sticky left-0 top-0 z-30 bg-card"
            style={{
              width: ROW_NUM_W,
              height: HEADER_H,
            }}
          >
            <div className="h-full w-full border-b border-r border-border" />
          </div>

          {/* Encabezados de columna */}
          <div
            className="sticky top-0 z-20 flex"
            style={{ marginLeft: ROW_NUM_W, height: HEADER_H }}
          >
            {Array.from({ length: file.colCount }).map((_, c) => (
              <ColumnHeader
                key={c}
                col={c}
                width={colWidth(c)}
                active={active?.col === c}
                onContextMenu={(e) => openCellMenu(e, 0, c)}
                onResize={(w) => setColWidth(file.id, c, w)}
              />
            ))}
          </div>

          {/* Filas */}
          {Array.from({ length: file.rowCount }).map((_, r) => (
            <div key={r} className="flex" style={{ height: rowHeight(r) }}>
              {/* número de fila */}
              <RowHeader
                row={r}
                height={rowHeight(r)}
                active={active?.row === r}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActive(r, 0);
                  setCtxMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      {
                        label: "Insertar fila arriba",
                        icon: <MenuIcons.ArrowUpToLine className="h-3.5 w-3.5" />,
                        onClick: () => addRow(file.id, r),
                      },
                      {
                        label: "Insertar fila abajo",
                        icon: <MenuIcons.ArrowDownToLine className="h-3.5 w-3.5" />,
                        onClick: () => addRow(file.id, r + 1),
                      },
                      { type: "separator" },
                      {
                        label: `Eliminar fila ${r + 1}`,
                        icon: <MenuIcons.Trash2 className="h-3.5 w-3.5" />,
                        disabled: r === 0,
                        onClick: () => deleteRow(file.id, r),
                      },
                    ],
                  });
                }}
                onResize={(h) => setRowHeight(file.id, r, h)}
              />
              {/* celdas */}
              {Array.from({ length: file.colCount }).map((_, c) => {
                const isActive = active?.row === r && active?.col === c;
                const isEditingThis = isActive && editing;
                const raw = file.cells[`${r},${c}`] ?? "";
                const disp = displayFor(r, c);
                const isFormula = raw.startsWith("=");
                const inRange = isInRange(r, c, range);
                const isDup = highlightDup && dupSet.has(disp.trim()) && disp.trim() !== "";
                const style = file.cellStyles?.[`${r},${c}`];
                return (
                  <div
                    key={c}
                    data-cell={`${r},${c}`}
                    onContextMenu={(e) => openCellMenu(e, r, c)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (e.shiftKey && active) {
                        // extender selección
                        setRange({
                          startRow: active.row,
                          startCol: active.col,
                          endRow: r,
                          endCol: c,
                        });
                      } else if (!isEditingThis) {
                        startRange(r, c);
                      }
                    }}
                    onMouseEnter={() => {
                      if (selecting) extendRange(r, c);
                    }}
                    onDoubleClick={() => {
                      setActive(r, c);
                      startEdit(raw);
                    }}
                    className={cn(
                      "cell-base relative cursor-cell select-none overflow-hidden border-b border-r border-border px-2 text-[12px]",
                      r === 0 && "bg-muted/40 font-medium",
                      isActive && !isEditingThis && "cell-active z-[3]",
                      inRange && !isActive && "bg-accent/30",
                      isDup && !style?.bg && "bg-amber-100 dark:bg-amber-900/30",
                      isFormula && "text-foreground"
                    )}
                    style={{
                      width: colWidth(c),
                      height: rowHeight(r),
                      backgroundColor: style?.bg,
                      color: style?.color,
                      fontWeight: style?.bold ? 700 : 400,
                      fontStyle: style?.italic ? "italic" : "normal",
                      fontSize: `${style?.fontSize ?? 12}px`,
                      textAlign: style?.align ?? (isNumeric(disp) ? "right" : "left"),
                    }}
                  >
                    {isEditingThis ? (
                      <input
                        ref={editRef}
                        value={editValue}
                        onChange={(e) => setEditValueUI(e.target.value)}
                        onBlur={commit}
                        className="absolute inset-0 h-full w-full border-none bg-background px-2 font-mono text-[12px] outline-none ring-2 ring-ring/40"
                      />
                    ) : (
                      <span
                        className="block truncate leading-[inherit]"
                        style={{ lineHeight: `${rowHeight(r)}px` }}
                      >
                        {disp}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Pie de grilla: ayuda de fórmulas */}
      <div className="flex items-center gap-3 border-t border-border bg-card/40 px-4 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          Fórmulas: <code className="font-mono">=SUMA(A1:A10)</code>{" "}
          <code className="font-mono">=SI(A1&gt;5;"Alto";"Bajo")</code>{" "}
          <code className="font-mono">=A1+B1</code>
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Clic derecho para más acciones · Shift+click selecciona rango · Arrastra para seleccionar · Ctrl+Z deshacer
        </span>
      </div>

      {/* Menú contextual personalizado */}
      {ctxMenu && (
        <CustomContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

function ColumnHeader({
  col,
  width,
  active,
  onContextMenu,
  onResize,
}: {
  col: number;
  width: number;
  active: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onResize: (w: number) => void;
}) {
  const startX = useRef(0);
  const startW = useRef(width);
  const dragging = useRef(false);

  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      onResize(startW.current + delta);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        "group sticky top-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-border bg-card text-[11px] font-medium text-muted-foreground cursor-pointer transition-colors",
        active && "bg-accent text-foreground"
      )}
      style={{ width, height: HEADER_H }}
    >
      {columnToLetter(col)}
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDownResize}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-ring/40 group-hover:bg-ring/20"
      />
    </div>
  );
}

function RowHeader({
  row,
  height,
  active,
  onContextMenu,
  onResize,
}: {
  row: number;
  height: number;
  active: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onResize: (h: number) => void;
}) {
  const startY = useRef(0);
  const startH = useRef(height);
  const dragging = useRef(false);

  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.cursor = "row-resize";
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientY - startY.current;
      onResize(startH.current + delta);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        "group sticky left-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-border bg-card text-[11px] font-medium text-muted-foreground cursor-pointer transition-colors",
        active && "bg-accent text-foreground"
      )}
      style={{ width: ROW_NUM_W, height }}
    >
      {row + 1}
      <div
        onMouseDown={onMouseDownResize}
        className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize bg-transparent transition-colors hover:bg-ring/40 group-hover:bg-ring/20"
      />
    </div>
  );
}

function isNumeric(v: string): boolean {
  if (v === "") return false;
  return !isNaN(parseFloat(v.replace(",", ".")));
}
