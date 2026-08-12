"use client";

import {
  Undo2,
  Redo2,
  Download,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEditorUI } from "@/lib/editor-store";
import { TAG_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TagDialog } from "./tag-dialog";

export function Topbar() {
  const activeView = useStore((s) => s.activeView);
  const file = useStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const exportFile = useStore((s) => s.exportFile);
  const addRow = useStore((s) => s.addRow);
  const addColumn = useStore((s) => s.addColumn);
  const canUndo = useStore((s) => (s.histories[s.activeFileId ?? ""] ?? []).length > 0);
  const canRedo = useStore((s) => (s.redoes[s.activeFileId ?? ""] ?? []).length > 0);
  const { toast } = useToast();

  const viewMeta =
    activeView === "resumen"
      ? { icon: <LayoutDashboard className="h-4 w-4" />, title: "Resumen general" }
      : activeView === "equipos"
      ? { icon: <Wrench className="h-4 w-4" />, title: "Equipos" }
      : { icon: <FileSpreadsheet className="h-4 w-4" />, title: file?.name ?? "Editor" };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 glass px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground">{viewMeta.icon}</span>
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {viewMeta.title}
        </h1>
        {file && activeView === "editor" && (
          <span className="ml-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            <span className="emoji">{TAG_META[file.tag].icon}</span>
            {TAG_META[file.tag].short}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {activeView === "editor" && file && (
          <>
            <FormulaBar />

            <div className="mx-1 h-6 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              className="press h-8 gap-1.5 rounded-lg px-2.5"
              onClick={() => addRow(file.id)}
              title="Agregar fila"
            >
              <span className="text-xs">+ Fila</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="press h-8 gap-1.5 rounded-lg px-2.5"
              onClick={() => addColumn(file.id)}
              title="Agregar columna"
            >
              <span className="text-xs">+ Columna</span>
            </Button>

            <div className="mx-1 h-6 w-px bg-border" />

            <Button
              variant="ghost"
              size="icon"
              className="press h-8 w-8 rounded-lg"
              onClick={() => undo(file.id)}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="press h-8 w-8 rounded-lg"
              onClick={() => redo(file.id)}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-6 w-px bg-border" />

            <TagDialog fileId={file.id} />
            <Button
              variant="ghost"
              size="icon"
              className="press h-8 w-8 rounded-lg"
              onClick={() => {
                exportFile(file.id);
                toast({ title: "Exportando a .xlsx…", description: file.name });
              }}
              title="Exportar a Excel"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function FormulaBar() {
  const file = useStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const setCell = useStore((s) => s.setCell);
  const active = useEditorUI((s) => s.active);
  const editing = useEditorUI((s) => s.editing);
  const startEdit = useEditorUI((s) => s.startEdit);
  const commitEdit = useEditorUI((s) => s.commitEdit);
  const setEditValueUI = useEditorUI((s) => s.setEditValue);
  const editValue = useEditorUI((s) => s.editValue);

  const safeCommit = () => {
    const st = useEditorUI.getState();
    if (!file || !st.editing || !st.editCell) return;
    setCell(file.id, st.editCell.row, st.editCell.col, st.editValue);
    commitEdit();
  };

  if (!file || !active) {
    return (
      <div className="flex items-center gap-1.5 opacity-50">
        <span className="min-w-[44px] rounded-md bg-muted px-2 py-1 text-center font-mono text-[11px] text-muted-foreground">
          —
        </span>
        <div className="h-8 w-[220px] rounded-lg border border-dashed border-border bg-muted/30" />
      </div>
    );
  }
  const key = `${active.row},${active.col}`;
  const raw = file.cells[key] ?? "";
  const shown = editing ? editValue : raw;
  const isFormula = shown.startsWith("=");

  return (
    <div className="flex items-center gap-1.5">
      <span className="min-w-[44px] rounded-md bg-muted px-2 py-1 text-center font-mono text-[11px] font-medium text-muted-foreground">
        {active.ref}
      </span>
      <span className="font-mono text-xs text-muted-foreground">fx</span>
      <input
        value={shown}
        onFocus={() => {
          if (!useEditorUI.getState().editing) startEdit(raw);
        }}
        onChange={(e) => {
          if (!useEditorUI.getState().editing) startEdit(raw);
          setEditValueUI(e.target.value);
        }}
        onBlur={safeCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            safeCommit();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            commitEdit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Valor o fórmula (=SUMA…)"
        className={cn(
          "h-8 w-[240px] rounded-lg border border-border bg-background px-2.5 font-mono text-xs outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20",
          isFormula && "font-semibold"
        )}
      />
    </div>
  );
}
