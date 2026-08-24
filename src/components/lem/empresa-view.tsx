"use client";

import { useState } from "react";
import { Building2, Users, Plus, Pencil, Trash2, Mail, Phone, Save, X, Truck, Shield, Check, X as XIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  PERMISO_META,
  PERMISOS_POR_ROL,
  ROL_META,
  type Permiso,
  type Rol,
  type MiembroEquipo,
} from "@/lib/types";
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
  const setPermisosMiembro = useStore((s) => s.setPermisosMiembro);
  const tienePermiso = useStore((s) => s.tienePermiso);

  const puedeGestionarPersonal = tienePermiso("gestionar_personal");
  const puedeGestionarPermisos = tienePermiso("gestionar_permisos");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(empresa);
  const [miembroDialog, setMiembroDialog] = useState(false);
  const [editingMiembro, setEditingMiembro] = useState<MiembroEquipo | null>(null);
  const [miembroForm, setMiembroForm] = useState({ nombre: "", rol: "tecnico" as Rol, correo: "", telefono: "" });
  const [permisosDialog, setPermisosDialog] = useState<MiembroEquipo | null>(null);
  const [permisosExtra, setPermisosExtra] = useState<Permiso[]>([]);
  const [permisosRevocados, setPermisosRevocados] = useState<Permiso[]>([]);

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

  const openPermisos = (m: MiembroEquipo) => {
    setPermisosDialog(m);
    setPermisosExtra(m.permisosExtra ?? []);
    setPermisosRevocados(m.permisosRevocados ?? []);
  };

  const savePermisos = () => {
    if (!permisosDialog) return;
    setPermisosMiembro(permisosDialog.id, permisosExtra, permisosRevocados);
    setPermisosDialog(null);
  };

  const togglePermisoExtra = (p: Permiso) => {
    setPermisosExtra((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
    // Si lo estamos quitando de extra, también limpiar revocado si estaba
    setPermisosRevocados((cur) => cur.filter((x) => x !== p));
  };

  const togglePermisoRevocado = (p: Permiso) => {
    setPermisosRevocados((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
    setPermisosExtra((cur) => cur.filter((x) => x !== p));
  };

  const byRol: Record<string, MiembroEquipo[]> = {};
  for (const m of miembros) {
    if (!byRol[m.rol]) byRol[m.rol] = [];
    byRol[m.rol].push(m);
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Building2 className="h-5 w-5" /> Empresas y Contactos
        </h1>
        <p className="text-sm text-muted-foreground">
          Empresas contratistas (ej: LPS) y técnicos a los que despachas. El almacén es LEMCORP.
        </p>
      </div>

      {/* Info de la empresa contratista */}
      <div className="anim-fade-up mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Empresa contratista / Cliente</h2>
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
            <div className="flex flex-col gap-1.5">
              <Label>Nombre de la empresa *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: LPS" className="rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>RUC</Label>
              <Input value={form.ruc ?? ""} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Teléfono</Label>
              <Input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Correo</Label>
              <Input value={form.correo ?? ""} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="rounded-xl" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Dirección</Label>
              <Input value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="rounded-xl" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Información de la empresa contratista</Label>
              <Textarea
                value={form.descripcion ?? ""}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder={"Ej:\nLPS — CONTRATISTA DE CLARO\nTÉCNICOS EN CAMPO: 30\nDespacho diario: ~17 técnicos\nCobertura: Lima Norte, Comas, Los Olivos\n...toda la info que necesites"}
                className="rounded-xl min-h-[140px] text-[13px] leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground">
                El almacén es de LEMCORP. Aquí registras la empresa contratista a la que despachas (ej: LPS que trabaja para Claro).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            <InfoRow label="Empresa" value={empresa.nombre} />
            {empresa.ruc && <InfoRow label="RUC" value={empresa.ruc} />}
            {empresa.direccion && <InfoRow label="Dirección" value={empresa.direccion} />}
            {empresa.telefono && <InfoRow label="Teléfono" value={empresa.telefono} />}
            {empresa.correo && <InfoRow label="Correo" value={empresa.correo} />}
            {empresa.descripcion && (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Información</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{empresa.descripcion}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Técnicos / Miembros del equipo de la contratista */}
      <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Técnicos y personal ({miembros.length})</h2>
          </div>
          {puedeGestionarPersonal && (
            <Button size="sm" onClick={openCreateMiembro} className="press h-8 rounded-lg"><Plus className="mr-1 h-3.5 w-3.5" />Añadir</Button>
          )}
        </div>

        {miembros.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] font-semibold text-foreground">Sin personal registrado</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {puedeGestionarPersonal
                ? "Añade a tu equipo: administradores, jefes, supervisores, técnicos y almaceneros."
                : "El administrador añadirá al personal cuando corresponda."}
            </p>
            {puedeGestionarPersonal && (
              <Button size="sm" onClick={openCreateMiembro} className="press mt-3 h-8 rounded-lg">
                <Plus className="mr-1 h-3.5 w-3.5" />Añadir primer miembro
              </Button>
            )}
          </div>
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {lista.map((m) => (
                      <div key={m.id} className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-accent/30">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold",
                          m.rol === "administrador" ? "bg-primary text-primary-foreground"
                          : m.rol === "jefe_operaciones" ? "bg-primary text-primary-foreground"
                          : m.rol === "supervisor" ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground")}>
                          {m.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{m.nombre}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            {m.correo && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{m.correo}</span>}
                            {m.telefono && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{m.telefono}</span>}
                          </div>
                          {(m.permisosExtra?.length || m.permisosRevocados?.length) ? (
                            <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                              <Shield className="h-2.5 w-2.5" /> Permisos personalizados
                            </span>
                          ) : null}
                        </div>
                        {puedeGestionarPersonal && (
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {puedeGestionarPermisos && m.rol !== "administrador" && (
                              <button onClick={() => openPermisos(m)} className="press rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Permisos">
                                <Shield className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => openEditMiembro(m)} className="press rounded-md p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteMiembro(m.id)} className="press rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de permisos */}
      <Dialog open={!!permisosDialog} onOpenChange={(v) => !v && setPermisosDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Permisos de {permisosDialog?.nombre}
            </DialogTitle>
            <p className="text-[12px] text-muted-foreground">
              Rol: <span className="font-semibold text-foreground">{permisosDialog ? ROL_META[permisosDialog.rol].label : ""}</span>
            </p>
          </DialogHeader>
          {permisosDialog && (
            <div className="flex flex-col gap-3 py-1">
              <p className="text-[11px] text-muted-foreground">
                Los permisos del rol ({ROL_META[permisosDialog.rol].label}) se aplican por defecto. Puedes otorgar permisos adicionales o revocar los del rol.
              </p>
              <div className="grid gap-2">
                {(Object.keys(PERMISO_META) as Permiso[]).map((p) => {
                  const meta = PERMISO_META[p];
                  const delRol = (PERMISOS_POR_ROL[permisosDialog.rol] ?? []).includes(p);
                  const esExtra = permisosExtra.includes(p);
                  const esRevocado = permisosRevocados.includes(p);
                  const efectivo = delRol ? !esRevocado : esExtra;
                  return (
                    <div
                      key={p}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                        efectivo ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                        {delRol && (
                          <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                            Permiso del rol
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {delRol ? (
                          // Si es del rol, solo se puede revocar/quitar revocación
                          <button
                            onClick={() => togglePermisoRevocado(p)}
                            className={cn(
                              "press flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                              esRevocado
                                ? "border-red-500/40 bg-red-500/10 text-red-400"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            )}
                          >
                            {esRevocado ? <XIcon className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                            {esRevocado ? "Revocado" : "Activo"}
                          </button>
                        ) : (
                          // Si no es del rol, se puede otorgar/quitar
                          <button
                            onClick={() => togglePermisoExtra(p)}
                            className={cn(
                              "press flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                              esExtra
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent"
                            )}
                          >
                            {esExtra ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {esExtra ? "Otorgado" : "Otorgar"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermisosDialog(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={savePermisos} className="btn-spacecom rounded-xl">
              <Save className="mr-1.5 h-4 w-4" /> Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog miembro */}
      <Dialog open={miembroDialog} onOpenChange={setMiembroDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingMiembro ? "Editar" : "Añadir"} técnico / personal</DialogTitle>
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
