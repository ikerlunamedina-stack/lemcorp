"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  fileId: string;
}

export function SheetTabs({ fileId }: Props) {
  const file = useStore((s) => s.files.find((f) => f.id === fileId));
  if (!file?.sheets || file.sheets.length <= 1) return null;

  const currentIdx = file.activeSheetIndex ?? 0;

  const setActiveSheet = (idx: number) => {
    if (idx === currentIdx) return;
    const state = useStore.getState();
    const currentFile = state.files.find((f) => f.id === fileId);
    if (!currentFile?.sheets) return;

    // 1. Guardar los cambios de la hoja actual en sheets[currentIdx]
    const updatedSheets = [...currentFile.sheets];
    updatedSheets[currentIdx] = {
      ...updatedSheets[currentIdx],
      rowCount: currentFile.rowCount,
      colCount: currentFile.colCount,
      cells: { ...currentFile.cells },
      colWidths: currentFile.colWidths,
      rowHeights: currentFile.rowHeights,
      cellStyles: currentFile.cellStyles,
    };

    // 2. Cargar la nueva hoja al nivel superior
    const newSheet = updatedSheets[idx];
    useStore.setState({
      files: state.files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              sheets: updatedSheets,
              activeSheetIndex: idx,
              rowCount: newSheet.rowCount,
              colCount: newSheet.colCount,
              cells: { ...newSheet.cells },
              colWidths: newSheet.colWidths,
              rowHeights: newSheet.rowHeights,
              cellStyles: newSheet.cellStyles,
            }
          : f
      ),
    });
  };

  return (
    <div className="flex items-end gap-0.5 border-t border-border bg-muted/30 px-2 pt-1.5 pb-0">
      {file.sheets.map((sheet, idx) => (
        <button
          key={idx}
          onClick={() => setActiveSheet(idx)}
          className={cn(
            "press flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[12px] font-medium transition-colors",
            idx === currentIdx
              ? "border-border bg-card text-foreground"
              : "border-transparent bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground"
          )}
        >
          {sheet.name}
        </button>
      ))}
    </div>
  );
}
