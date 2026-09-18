"use client";

/**
 * useConfirm — Hook reutilizable para confirmar eliminaciones.
 *
 * En vez de usar el confirm() nativo del navegador (que es feo y fácil de
 * aceptar por accidente), este hook muestra un AlertDialog estilizado.
 *
 * Para items críticos (con series, recepciones completas, transferencias),
 * pide escribir "ELIMINAR" para confirmar — previene clicks accidentales
 * con mouse defectuoso.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Eliminar producto",
 *     description: "Router ONT HG8145X6 (SKU 4076358)",
 *     critical: true,  // pide escribir ELIMINAR
 *   });
 *   if (ok) deleteProduct(id);
 */

import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmOptions {
  title: string;
  description?: string;
  /** Texto del botón de confirmación (default: "Eliminar") */
  confirmText?: string;
  /** Si es true, pide escribir "ELIMINAR" para confirmar — para acciones destructivas graves */
  critical?: boolean;
  /** Detalles adicionales a mostrar (ej: cantidad de items, series, etc.) */
  details?: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const REQUIRED_TEXT = "ELIMINAR";

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setInputValue("");
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
    setInputValue("");
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
    setInputValue("");
  };

  const isCritical = state?.critical ?? false;
  const isConfirmed = !isCritical || inputValue === REQUIRED_TEXT;

  const ConfirmDialog = (
    <AlertDialog open={state !== null} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogContent className="rounded-lg border-destructive/30 p-0 gap-0 max-w-md">
        <AlertDialogHeader className="border-b border-border px-5 py-4 flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <AlertDialogTitle className="text-[15px] font-semibold text-foreground">
              {state?.title}
            </AlertDialogTitle>
            {state?.description && (
              <AlertDialogDescription className="text-[12px] text-muted-foreground mt-1">
                {state.description}
              </AlertDialogDescription>
            )}
            {state?.details && (
              <pre className="mt-2 max-h-[200px] overflow-auto rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground whitespace-pre-wrap">
{state.details}
              </pre>
            )}
          </div>
        </AlertDialogHeader>

        {isCritical && (
          <div className="px-5 py-3 bg-amber-500/5 border-b border-border">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-1.5">
              Para confirmar, escribe <strong>{REQUIRED_TEXT}</strong> en el campo:
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={REQUIRED_TEXT}
              autoFocus
              className="h-8 rounded-md font-mono text-[12px] uppercase"
              onKeyDown={(e) => { if (e.key === "Enter" && isConfirmed) handleConfirm(); }}
            />
          </div>
        )}

        <AlertDialogFooter className="px-5 py-3 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-9 rounded-lg border-border bg-background text-[13px] hover:bg-muted"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmed}
              className="h-9 rounded-lg bg-destructive text-white px-4 text-[13px] font-medium hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              {state?.confirmText || "Eliminar"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
