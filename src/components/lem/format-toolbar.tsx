"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
  Eraser,
  Layers,
  Plus,
  Minus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useEditorUI, rangeCells } from "@/lib/editor-store";
import type { CellStyle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Paleta de colores (escala de grises + acentos sobrios para no romper el tema).
const BG_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
  "#4b5563",
  "#1f2937",
  "#000000",
  "#fef3c7",
  "#fde68a",
  "#fecaca",
  "#fca5a5",
  "#bbf7d0",
  "#86efac",
  "#bfdbfe",
  "#93c5fd",
  "#ddd6fe",
  "#c4b5fd",
  "#fed7aa",
  "#fdba74",
];
const TEXT_COLORS = [
  "#111827",
  "#374151",
  "#6b7280",
  "#9ca3af",
  "#ffffff",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

export function FormatToolbar() {
  const file = useStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const setCellStyle = useStore((s) => s.setCellStyle);
  const clearCellStyle = useStore((s) => s.clearCellStyle);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const range = useEditorUI((s) => s.range);
  const active = useEditorUI((s) => s.active);
  const { toast } = useToast();

  const [bgOpen, setBgOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [fontSize, setFontSize] = useState("12");
  const bgRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bgRef.current && !bgRef.current.contains(e.target as Node)) setBgOpen(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!file || !active) return null;

  // Celdas objetivo: la selección de rango si hay más de 1, sino la celda activa.
  const cells = range && (range.startRow !== range.endRow || range.startCol !== range.endCol)
    ? rangeCells(range)
    : [active];

  const currentStyle: CellStyle = file.cellStyles?.[`${active.row},${active.col}`] ?? {};

  const apply = (style: Partial<CellStyle>) => {
    setCellStyle(file.id, cells, style);
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card/60 glass px-2">
      {/* Negrita */}
      <ToolButton
        active={!!currentStyle.bold}
        onClick={() => apply({ bold: true })}
        title="Negrita"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolButton>
      {/* Cursiva */}
      <ToolButton
        active={!!currentStyle.italic}
        onClick={() => apply({ italic: true })}
        title="Cursiva"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolButton>

      <Divider />

      {/* Tamaño de fuente */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => {
            const next = Math.max(8, (currentStyle.fontSize ?? 12) - 1);
            setFontSize(String(next));
            apply({ fontSize: next });
          }}
          className="press flex h-6 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          title="Reducir tamaño"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => {
            const n = parseInt(fontSize, 10);
            if (!isNaN(n) && n >= 8 && n <= 48) apply({ fontSize: n });
            else setFontSize(String(currentStyle.fontSize ?? 12));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-6 w-9 rounded-md border border-border bg-background text-center text-[11px] font-medium tabular-nums outline-none focus:border-ring"
          title="Tamaño de fuente"
        />
        <button
          onClick={() => {
            const next = Math.min(48, (currentStyle.fontSize ?? 12) + 1);
            setFontSize(String(next));
            apply({ fontSize: next });
          }}
          className="press flex h-6 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          title="Aumentar tamaño"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <Divider />

      {/* Color de fondo */}
      <div ref={bgRef} className="relative">
        <ToolButton
          active={!!currentStyle.bg}
          onClick={() => setBgOpen((o) => !o)}
          title="Color de fondo"
        >
          <Palette className="h-3.5 w-3.5" />
          <span
            className="absolute bottom-0.5 left-1 h-0.5 w-4 rounded-full"
            style={{ background: currentStyle.bg ?? "#9ca3af" }}
          />
        </ToolButton>
        {bgOpen && (
          <ColorPalette
            colors={BG_COLORS}
            onPick={(c) => {
              apply({ bg: c });
              setBgOpen(false);
              toast({ title: "Color aplicado", description: `${cells.length} celda(s)` });
            }}
            onClear={() => {
              apply({ bg: undefined });
              setBgOpen(false);
            }}
          />
        )}
      </div>

      {/* Color de texto */}
      <div ref={colorRef} className="relative">
        <ToolButton
          active={!!currentStyle.color}
          onClick={() => setColorOpen((o) => !o)}
          title="Color de texto"
        >
          <Type className="h-3.5 w-3.5" />
          <span
            className="absolute bottom-0.5 left-1 h-0.5 w-4 rounded-full"
            style={{ background: currentStyle.color ?? "#9ca3af" }}
          />
        </ToolButton>
        {colorOpen && (
          <ColorPalette
            colors={TEXT_COLORS}
            onPick={(c) => {
              apply({ color: c });
              setColorOpen(false);
              toast({ title: "Color aplicado", description: `${cells.length} celda(s)` });
            }}
            onClear={() => {
              apply({ color: undefined });
              setColorOpen(false);
            }}
          />
        )}
      </div>

      <Divider />

      {/* Alineación */}
      <ToolButton
        active={currentStyle.align === "left" || !currentStyle.align}
        onClick={() => apply({ align: "left" })}
        title="Izquierda"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        active={currentStyle.align === "center"}
        onClick={() => apply({ align: "center" })}
        title="Centro"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        active={currentStyle.align === "right"}
        onClick={() => apply({ align: "right" })}
        title="Derecha"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolButton>

      <Divider />

      {/* Quitar formato */}
      <ToolButton
        onClick={() => {
          clearCellStyle(file.id, cells);
          toast({ title: "Formato quitado", description: `${cells.length} celda(s)` });
        }}
        title="Quitar formato"
      >
        <Eraser className="h-3.5 w-3.5" />
      </ToolButton>

      {/* Resaltar duplicados (toggle global) */}
      <Divider />
      <ToolButton
        active={settings.highlightDuplicates}
        onClick={() => {
          const v = !settings.highlightDuplicates;
          setSetting("highlightDuplicates", v);
          toast({
            title: v ? "Resaltado de duplicados activado" : "Desactivado",
            description: v ? "Los valores repetidos se colorean" : undefined,
          });
        }}
        title="Resaltar duplicados"
      >
        <Layers className="h-3.5 w-3.5" />
        <span className="ml-1 text-[11px]">Duplicados</span>
      </ToolButton>
    </div>
  );
}

function ToolButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "press relative flex h-6 items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}

function ColorPalette({
  colors,
  onPick,
  onClear,
}: {
  colors: string[];
  onPick: (c: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="anim-scale-in absolute left-0 top-7 z-50 w-[208px] rounded-xl border border-border bg-popover p-2 shadow-2xl">
      <div className="grid grid-cols-5 gap-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="press h-7 w-7 rounded-md border border-border transition-transform hover:scale-110"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <button
        onClick={onClear}
        className="press mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1 text-[11px] text-muted-foreground hover:bg-accent"
      >
        <Eraser className="h-3 w-3" />
        Sin color
      </button>
    </div>
  );
}
