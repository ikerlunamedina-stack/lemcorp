"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SyncProvider } from "@/components/lem/sync-provider";
import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { NotificationStack } from "@/components/lem/notification-stack";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles, Copy, ClipboardPaste, CheckSquare, X, Brain, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  isChat?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

export function AppShell({ children, isChat = false }: AppShellProps) {
  const router = useRouter();
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });

  // Bloquear click derecho nativo del navegador y mostrar menú propio
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY, visible: true });
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Cerrar menú al hacer click en cualquier lado
  useEffect(() => {
    if (!ctxMenu.visible) return;
    const handleClick = () => setCtxMenu((s) => ({ ...s, visible: false }));
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtxMenu((s) => ({ ...s, visible: false }));
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ctxMenu.visible]);

  // Bloquear F12, Ctrl+Shift+I, Ctrl+U (inspeccionar / ver código)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I o Ctrl+Shift+J o Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (ver código fuente)
      if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const copySelection = useCallback(async () => {
    const selection = window.getSelection()?.toString() || "";
    if (selection) {
      try { await navigator.clipboard.writeText(selection); } catch {}
    }
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Pegar en el elemento con focus o en un input activo
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          const start = active.selectionStart ?? active.value.length;
          const end = active.selectionEnd ?? active.value.length;
          active.value = active.value.slice(0, start) + text + active.value.slice(end);
          active.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch {}
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, []);

  const selectAll = useCallback(() => {
    window.getSelection()?.selectAllChildren(document.body);
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, []);

  const goToIA = useCallback(() => {
    router.push("/ia");
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, [router]);

  const goToBloc = useCallback(() => {
    router.push("/bloc");
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, [router]);

  const goToReportes = useCallback(() => {
    router.push("/reportes");
    setCtxMenu((s) => ({ ...s, visible: false }));
  }, [router]);

  return (
    <SyncProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Navbar />
        {!isChat && <SubHeader />}
        <main className={cn("relative flex-1", isChat ? "overflow-hidden" : "overflow-auto scroll-thin")}>
          {isChat ? (
            children
          ) : (
            <div className="min-h-full pb-14 lg:pb-0 anim-page-enter">
              {children}
            </div>
          )}
        </main>
        {!isChat && <Footer />}
        <NotificationStack />
      </div>

      {/* Menú contextual personalizado (reemplaza click derecho del browser) */}
      {ctxMenu.visible && (
        <div
          className="fixed z-[200] min-w-[200px] rounded-lg border border-border bg-card shadow-lg overflow-hidden anim-fade-in"
          style={{ left: Math.min(ctxMenu.x, window.innerWidth - 220), top: Math.min(ctxMenu.y, window.innerHeight - 300) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menú del Sistema</p>
          </div>
          <div className="py-1">
            <button
              onClick={goToIA}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Ir a IA (Alana)
            </button>
            <button
              onClick={copySelection}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Copiar selección
            </button>
            <button
              onClick={pasteFromClipboard}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Pegar
            </button>
            <button
              onClick={selectAll}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <CheckSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Seleccionar todo
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={goToBloc}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Ir a Bloc de notas
            </button>
            <button
              onClick={goToReportes}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Ir a Reportes
            </button>
          </div>
          <div className="border-t border-border bg-muted/20 px-3 py-1.5">
            <button
              onClick={() => setCtxMenu((s) => ({ ...s, visible: false }))}
              className="flex w-full items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" strokeWidth={1.5} /> Cerrar
            </button>
          </div>
        </div>
      )}
    </SyncProvider>
  );
}
