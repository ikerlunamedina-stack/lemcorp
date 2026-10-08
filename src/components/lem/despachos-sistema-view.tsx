"use client";

import { useState, useMemo } from "react";
import {
  TrendingDown,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DespachosView() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const addDespacho = useStore((s) => s.addDespacho);
  const deleteDespacho = useStore((s) => s.deleteDespacho);
  const getDespachosDelDia = useStore((s) => s.getDespachosDelDia);
  const { toast } = useToast();

  const [sku, setSku] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [cliente, setCliente] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [guia, setGuia] = useState("");

  const despachosHoy = useMemo(
    () => getDespachosDelDia(),
    [getDespachosDelDia, despachos]
  );

  const productoSel = products.find((p) => p.sku === sku);
  const cantNum = parseInt(cantidad, 10);
  const stockSuficiente = productoSel ? productoSel.quantity >= cantNum : false;
  const puedeRegistrar = sku && cantidad && cantNum > 0 && stockSuficiente;

  const registrar = () => {
    if (!puedeRegistrar) return;
    const id = addDespacho({
      sku: productoSel!.sku,
      producto: productoSel!.name,
      cantidad: cantNum,
      cliente: cliente.trim() || undefined,
      tecnico: tecnico.trim() || undefined,
      guia: guia.trim() || undefined,
    });
    if (id) {
      toast({
        title: "Despacho registrado",
        description: `${cantNum} × ${productoSel!.name} → stock: ${productoSel!.quantity - cantNum}`,
      });
      // limpiar formulario
      setSku("");
      setCantidad("");
      setCliente("");
      setTecnico("");
      setGuia("");
    } else {
      toast({ title: "No se pudo registrar", variant: "destructive" });
    }
  };

  const eliminarDespacho = (id: string) => {
    deleteDespacho(id);
    toast({ title: "Despacho eliminado", description: "El stock fue devuelto al inventario" });
  };

  const totalDespachadoHoy = despachosHoy.reduce((s, d) => s + d.cantidad, 0);

  return (
    <div className="px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <TrendingDown className="h-5 w-5" />
          Despachos
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra despachos y el stock se descuenta automáticamente del inventario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Formulario */}
        <div className="anim-fade-up rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Registrar despacho</h2>
          <div className="flex flex-col gap-3">
            {/* Producto */}
            <div className="flex flex-col gap-1.5">
              <Label>Producto</Label>
              <Select value={sku} onValueChange={setSku}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecciona un producto…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.sku}>
                      <span className="font-mono text-[11px]">{p.sku}</span>
                      {" — "}
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        ({fmtNum(p.quantity)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock disponible */}
            {productoSel && (
              <div className={cn(
                "flex items-center gap-2 rounded-lg border p-2 text-[12px]",
                stockSuficiente
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              )}>
                {stockSuficiente ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Stock disponible: <strong>{fmtNum(productoSel.quantity)}</strong>
                {!stockSuficiente && " (insuficiente)"}
              </div>
            )}

            {/* Cantidad */}
            <div className="flex flex-col gap-1.5">
              <Label>Cantidad a despachar *</Label>
              <Input
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Ej. 10"
                inputMode="numeric"
                className="rounded-xl tabular-nums"
              />
            </div>

            {/* Cliente */}
            <div className="flex flex-col gap-1.5">
              <Label>Cliente (opcional)</Label>
              <Input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej. Corporación ABC"
                className="rounded-xl"
              />
            </div>

            {/* Destinatario */}
            <div className="flex flex-col gap-1.5">
              <Label>Destinatario (opcional)</Label>
              <Input
                value={tecnico}
                onChange={(e) => setTecnico(e.target.value)}
                placeholder="Ej. J. Pérez"
                className="rounded-xl"
              />
            </div>

            {/* Guía */}
            <div className="flex flex-col gap-1.5">
              <Label>Guía (opcional)</Label>
              <Input
                value={guia}
                onChange={(e) => setGuia(e.target.value)}
                placeholder="Ej. G001-2026"
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={registrar}
              disabled={!puedeRegistrar}
              className="press mt-2 rounded-xl"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar despacho
            </Button>
          </div>
        </div>

        {/* Despachos de hoy */}
        <div className="anim-fade-up rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Despachos de hoy</h2>
            <span className="text-[11px] text-muted-foreground">
              {despachosHoy.length} despacho(s) · {fmtNum(totalDespachadoHoy)} und
            </span>
          </div>
          {despachosHoy.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">
                No hay despachos registrados hoy.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto scroll-thin">
              {despachosHoy.map((d) => (
                <div
                  key={d.id}
                  className="group flex items-start gap-2.5 rounded-xl border border-border/60 p-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
                    {d.cantidad}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{d.producto}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{d.sku}</p>
                    {(d.cliente || d.tecnico) && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {d.cliente && `👤 ${d.cliente}`}
                        {d.cliente && d.tecnico && " · "}
                        {d.tecnico && `📦 ${d.tecnico}`}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(d.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => eliminarDespacho(d.id)}
                    className="press rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
