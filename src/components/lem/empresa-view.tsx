"use client";

import { useState } from "react";
import { Building2, Users, Plus, Pencil, Trash2, Mail, Phone, Save, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROL_META, type Rol, type MiembroEquipo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const ROLES: Rol[] = ["jefe_operaciones", "supervisor", "tecnico", "almacenero", "administrador"];

export function EmpresaView() {
  const empresa = useStore((s) => s.empresa);
  const updateEmpresa = useStore((s) => s.updateEmpresa);
  const miembros = useStore((s) => s.miembros);
  const addMiembro = useStore((s) => s.addMiembro);
  const updateMiembro = useStore((s) => s.updateMiembro);
  const deleteMiembro = useStore((s) => s.deleteMiembro);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(empresa);
  const [miembroDialog, setMiembroDialog] = useState(false);
  const [editingMiembro, setEditingMiembro] = useState<MiembroEquipo | null>(null);
  const [miembroForm, setMiembroForm] = useState({ nombre: "", rol: "tecnico" as Rol, correo: "", telefono: "" });

  const saveEmpresa = () => {
    updateEmpresa(form);
    setEditing(false);
  };

  const openCreateMiembro = () => {
    setEditingMiembro(null);
    setMiembroForm({ nombre: "", rol: "tecnico", correo: "", telefono: "" });
    setMiembroDialog(true);
  };

  const openEditMiembro = (m: MiembroEquipo) => {
    setEditingMiembro(m);
    setMiembroForm({ nombre: m.nombre, rol: m.rol, correo: m.correo ?? "", telefono: m.telefono ?? "" });
    setMiembroDialog(true);
  };

  const saveMiembro = () => {
    if (!miembroForm.nombre.trim()) return;
    if (editingMiembro) {
      updateMiembro(editingMiembro.id, { ...miembroForm, correo: miembroForm.correo || undefined, telefono: miembroForm.telefono || undefined });
    } else {
      addMiembro(miembroForm.nombre, miembroForm.rol, miembroForm.correo || undefined, miembroForm.telefono || undefined);
    }
    setMiembroDialog(false);
  };

  const byRol: Record<string, MiembroEquipo[]> = {};
  for (const m of miembros) {
    if (!byRol[m.rol]) byRol[m.rol] = [];
    byRol[m.rol].push(m);
  }

  return (
    <div className="px-6 py-6">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Building2 className="h-5 w-5" /> Empresa
        </h1>
        <p className="text-sm text-muted-foreground">Información de la empresa y equipo de trabajo</p>
      </div>

      {/* Info empresa */}
      <div className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold">Información de la empresa</h2>
          </div>
          {editing ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="press h-7 rounded-lg"><X className="h-3.5 w-3.5" /></Button>
              <Button size="sm" onClick={saveEmpresa} className="press h-7 rounded-lg"><Save className="mr-1 h-3.5 w-3.5" />Guardar</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => { setForm(empresa); setEditing(true); }} className="press h-7 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Nombre de la empresa *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-xl" /></div>
            <div className="flex flex-col gap-1.5"><Label>RUC</Label><Input value={form.ruc ?? ""} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="rounded-xl" /></div>
            <div className="flex flex-col gap-1.5"><Label>Teléfono</Label><Input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="rounded-xl" /></div>
            <div className="flex flex-col gap-1.5"><Label>Correo</Label><Input value={form.correo ?? ""} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="rounded-xl" /></div>
            <div className="col-span-2 flex flex-col gap-1.5"><Label>Dirección</Label><Input value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="rounded-xl" /></div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Información detallada de la empresa</Label>
              <Textarea
                value={form.descripcion ?? ""}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder={"Ej:\nLPS - CONTRATISTA DE CLARO\nTÉCNICOS EN CAMPO: 30\nÁREAS DE COBERTURA: Lima Norte, Comas, Los Olivos\n...toda la info que quieras poner"}
                className="rounded-xl min-h-[140px] text-[13px] leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground">Puedes escribir toda la información que necesites aquí.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            <InfoRow label="Nombre" value={empresa.nombre} />
            {empresa.ruc && <InfoRow label="RUC" value={empresa.ruc} />}
            {empresa.direccion && <InfoRow label="Dirección" value={empresa.direccion} />}
            {empresa.telefono && <InfoRow label="Teléfono" value={empresa.telefono} />}
            {empresa.correo && <InfoRow label="Correo" value={empresa.correo} />}
            {empresa.descripcion && (
              <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Información detallada</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{empresa.descripcion}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Miembros del equipo */}
      <div className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold">Equipo de trabajo ({miembros.length})</h2>
          </div>
          <Button size="sm" onClick={openCreateMiembro} className="press h-8 rounded-lg"><Plus className="mr-1 h-3.5 w-3.5" />Añadir</Button>
        </div>

        {miembros.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">No hay miembros registrados.</p>
        ) : (
          <div className="space-y-3">
            {ROLES.map((rol) => {
              const lista = byRol[rol] ?? [];
              if (lista.length === 0) return null;
              return (
                <div key={rol}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {ROL_META[rol].label} ({lista.length})
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {lista.map((m) => (
                      <div key={m.id} className="group flex items-center gap-3 rounded-2xl border border-border/60 p-3 hover:bg-accent/30">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold",
                          m.rol === "jefe_operaciones" ? "bg-primary text-primary-foreground" : m.rol === "supervisor" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {m.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{m.nombre}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            {m.correo && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{m.correo}</span>}
                            {m.telefono && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{m.telefono}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEditMiembro(m)} className="press rounded-md p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteMiembro(m.id)} className="press rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog miembro */}
      <Dialog open={miembroDialog} onOpenChange={setMiembroDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingMiembro ? "Editar miembro" : "Añadir miembro"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Nombre *</Label><Input value={miembroForm.nombre} onChange={(e) => setMiembroForm({ ...miembroForm, nombre: e.target.value })} className="rounded-xl" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rol</Label>
              <Select value={miembroForm.rol} onValueChange={(v) => setMiembroForm({ ...miembroForm, rol: v as Rol })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{ROLES.map((r) => <SelectItem key={r} value={r}>{ROL_META[r].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Teléfono</Label><Input value={miembroForm.telefono} onChange={(e) => setMiembroForm({ ...miembroForm, telefono: e.target.value })} className="rounded-xl" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Correo</Label><Input value={miembroForm.correo} onChange={(e) => setMiembroForm({ ...miembroForm, correo: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMiembroDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={saveMiembro} disabled={!miembroForm.nombre.trim()} className="rounded-xl">{editingMiembro ? "Guardar" : "Añadir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-[100px] text-muted-foreground">{label}:</span>
      <span className="flex-1 font-medium">{value}</span>
    </div>
  );
}
