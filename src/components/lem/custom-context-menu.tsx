"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  ClipboardPaste,
  Scissors,
  Trash2,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Plus,
  Eraser,
  Sigma,
  ChevronRight,
  TrendingUp,
  Split,
  Hash,
  CaseSensitive,
  Calendar,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  type?: "item" | "separator" | "submenu";
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: MenuItem[];
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function CustomContextMenu({ x, y, items, onClose }: Props) {
  const [pos, setPos] = useState({ x, y });
  const [submenuFor, setSubmenuFor] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Ajustar posición para no salir de la ventana (medición post-render legítima)
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth - 8) nx = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) ny = window.innerHeight - rect.height - 8;
    if (nx < 8) nx = 8;
    if (ny < 8) ny = 8;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Cerrar al hacer click fuera o al presionar Escape
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="anim-scale-in fixed z-[100] min-w-[220px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} className="my-1 h-px bg-border" />;
        }
        if (item.type === "submenu" && item.children) {
          return (
            <Submenu
              key={i}
              item={item}
              isOpen={submenuFor === i}
              onOpen={() => setSubmenuFor(i)}
              onClose={() => setSubmenuFor(null)}
            />
          );
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            onMouseEnter={() => setSubmenuFor(null)}
            className={cn(
              "press flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
              item.disabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-foreground hover:bg-accent"
            )}
          >
            {item.icon && (
              <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

function Submenu({
  item,
  isOpen,
  onOpen,
  onClose,
}: {
  item: MenuItem;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        onMouseEnter={onOpen}
        onClick={onOpen}
        className="press flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-accent"
      >
        {item.icon && (
          <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
            {item.icon}
          </span>
        )}
        <span className="flex-1">{item.label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {isOpen && (
        <div
          className="anim-scale-in absolute left-full top-0 z-[101] ml-1 min-w-[200px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl"
          onMouseLeave={onClose}
        >
          {item.children!.map((child, i) => {
            if (child.type === "separator") {
              return <div key={i} className="my-1 h-px bg-border" />;
            }
            return (
              <button
                key={i}
                disabled={child.disabled}
                onClick={() => {
                  child.onClick?.();
                  onClose();
                }}
                className={cn(
                  "press flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  child.disabled
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {child.icon && (
                  <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
                    {child.icon}
                  </span>
                )}
                <span className="flex-1">{child.label}</span>
                {child.shortcut && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {child.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Exporta iconos útiles para construir menús
export const MenuIcons = {
  Copy,
  ClipboardPaste,
  Scissors,
  Trash2,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Plus,
  Eraser,
  Sigma,
  ChevronRight,
  TrendingUp,
  Split,
  Hash,
  CaseSensitive,
  Calendar,
  Type,
};
