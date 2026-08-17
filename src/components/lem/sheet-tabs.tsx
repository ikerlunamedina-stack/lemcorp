"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  fileId: string;
}

export function SheetTabs({ fileId }: Props) {
  const file = useStore((s) => s.files.find((f) => f.id === fileId));
  if (!file?.sheets || file.sheets.length <= 1) return null;

  const setActiveSheet = (idx: number) => {
    // Actualizar el archivo: copiar la hoja activa al nivel superior
    const sheet = file.sheets![idx];
    useStore.setState({
      files: useStore.getState().files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              activeSheetIndex: idx,
              rowCount: sheet.rowCount,
              colCount: sheet.colCount,
              cells: sheet.cells,
              colWidths: sheet.colWidths,
              rowHeights: sheet.rowHeights,
              cellStyles: sheet.cellStyles,
            }
          : f
      ),
    });
  };

  return (
    <div className="flex items-end gap-0.5 border-t border-border bg-muted/30 px-2 pt-1.5">
      {file.sheets.map((sheet, idx) => (
        <button
          key={idx}
          onClick={() => setActiveSheet(idx)}
          className={cn(
            "press flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[12px] font-medium transition-colors",
            idx === (file.activeSheetIndex ?? 0)
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
