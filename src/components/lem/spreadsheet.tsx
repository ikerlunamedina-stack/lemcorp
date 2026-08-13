"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useEditorUI } from "@/lib/editor-store";
import { recalcFile, columnToLetter, coordToRef } from "@/lib/formulas";
import { cn } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const COL_W = 120;
const ROW_H = 30;
const HEADER_H = 30;
const ROW_NUM_W = 48;

export function SpreadsheetView() {
  const file = useStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const setCell = useStore((s) => s.setCell);
  const addRow = useStore((s) => s.addRow);
  const deleteRow = useStore((s) => s.deleteRow);
  const addColumn = useStore((s) => s.addColumn);
  const deleteColumn = useStore((s) => s.deleteColumn);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setActiveView = useStore((s) => s.setActiveView);
  const createFile = useStore((s) => s.createFile);

  const active = useEditorUI((s) => s.active);
  const setActive = useEditorUI((s) => s.setActive);
  const clearActive = useEditorUI((s) => s.clearActive);
  const editing = useEditorUI((s) => s.editing);
  const editValue = useEditorUI((s) => s.editValue);
  const startEdit = useEditorUI((s) => s.startEdit);
  const setEditValueUI = useEditorUI((s) => s.setEditValue);
  const commitEdit = useEditorUI((s) => s.commitEdit);
  const cancelEdit = useEditorUI((s) => s.cancelEdit);

  const gridRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // valores calculados (memo por contenido del archivo)
  const computed = useMemo(() => {
    if (!file) return {};
    return recalcFile(file);
  }, [file]);

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

      {/* Grilla */}
      <div
        ref={gridRef}
        className="relative flex-1 overflow-auto scroll-thin bg-background"
      >
        <div
          className="relative"
          style={{
            minWidth: ROW_NUM_W + file.colCount * COL_W,
            minHeight: HEADER_H + file.rowCount * ROW_H,
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
                active={active?.col === c}
                onAdd={() => addColumn(file.id)}
                onDelete={() => deleteColumn(file.id, c)}
              />
            ))}
          </div>

          {/* Filas */}
          {Array.from({ length: file.rowCount }).map((_, r) => (
            <div key={r} className="flex" style={{ height: ROW_H }}>
              {/* número de fila */}
              <RowHeader
                row={r}
                active={active?.row === r}
                onAdd={() => addRow(file.id, r)}
                onDelete={() => deleteRow(file.id, r)}
              />
              {/* celdas */}
              {Array.from({ length: file.colCount }).map((_, c) => {
                const isActive = active?.row === r && active?.col === c;
                const isEditingThis = isActive && editing;
                const raw = file.cells[`${r},${c}`] ?? "";
                const disp = displayFor(r, c);
                const isFormula = raw.startsWith("=");
                return (
                  <div
                    key={c}
                    data-cell={`${r},${c}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isEditingThis) {
                        setActive(r, c);
                      }
                    }}
                    onDoubleClick={() => {
                      setActive(r, c);
                      startEdit(raw);
                    }}
                    className={cn(
                      "cell-base relative cursor-cell select-none border-b border-r border-border bg-card px-2 text-[12px] leading-[28px]",
                      r === 0 && "bg-muted/40 font-medium",
                      isActive && !isEditingThis && "cell-active bg-accent/40",
                      isFormula && "text-foreground"
                    )}
                    style={{ width: COL_W, height: ROW_H }}
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
                        className={cn(
                          "block truncate",
                          isFormula ? "font-medium" : "",
                          isNumeric(disp) ? "text-right tabular-nums" : ""
                        )}
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
          Tab ↦ derecha · Enter ↦ abajo · Ctrl+Z deshacer
        </span>
      </div>
    </div>
  );
}

function ColumnHeader({
  col,
  active,
  onAdd,
  onDelete,
}: {
  col: number;
  active: boolean;
  onAdd: () => void;
  onDelete: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "sticky top-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-border bg-card text-[11px] font-medium text-muted-foreground",
            active && "bg-accent text-foreground"
          )}
          style={{ width: COL_W, height: HEADER_H }}
        >
          {columnToLetter(col)}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="rounded-xl">
        <ContextMenuItem onClick={onAdd}>Insertar columna</ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          Eliminar columna
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function RowHeader({
  row,
  active,
  onAdd,
  onDelete,
}: {
  row: number;
  active: boolean;
  onAdd: () => void;
  onDelete: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "sticky left-0 z-10 flex shrink-0 items-center justify-center border-b border-r border-border bg-card text-[11px] font-medium text-muted-foreground",
            active && "bg-accent text-foreground"
          )}
          style={{ width: ROW_NUM_W, height: ROW_H }}
        >
          {row + 1}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="rounded-xl">
        <ContextMenuItem onClick={onAdd}>Insertar fila</ContextMenuItem>
        {row > 0 && (
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            Eliminar fila
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function isNumeric(v: string): boolean {
  if (v === "") return false;
  return !isNaN(parseFloat(v.replace(",", ".")));
}
