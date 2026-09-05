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

const ROLES: Rol[] = ["jefe_operaciones", "supervisor", "almacenero", "administrador"];

const ICON_PROPS = { strokeWidth: 1.5 } as const;

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
  const [miembroForm, setMiembroForm] = useState({ nombre: "", rol: "almacenero" as Rol, correo: "", telefono: "" });
  const [permisosDialog, setPermisosDialog] = useState<MiembroEquipo | null>(null);
  const [permisosExtra, setPermisosExtra] = useState<Permiso[]>([]);
  const [permisosRevocados, setPermisosRevocados] = useState<Permiso[]>([]);

  const saveEmpresa = () => {
    updateEmpresa(form);
    setEditing(false);
  };

  const openCreateMiembro = () => {
    setEditingMiembro(null);
    setMiembroForm({ nombre: "", rol: "almacenero", correo: "", telefono: "" });
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
    <div className="anim-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="anim-slide-up mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Organización
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Empresas y Contactos
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Empresas contratistas (ej: LPS) y personal a los que despachas. El almacén es LEMCORP.
          </p>
        </div>
      </div>

      {/* Info de la empresa contratista */}
      <div className="anim-slide-up mb-6 overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Empresa contratista / Cliente</h2>
          </div>
          {editing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(false)}
                className="press inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" {...ICON_PROPS} />
              </button>
              <button
                onClick={saveEmpresa}
                className="press inline-flex h-7 items-center gap-1 rounded-md bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90"
              >
                <Save className="h-3.5 w-3.5" {...ICON_PROPS} />
                Guardar
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setForm(empresa); setEditing(true); }}
              className="press inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="p-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Nombre de la empresa *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: LPS"
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">RUC</Label>
                <Input
                  value={form.ruc ?? ""}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Teléfono</Label>
                <Input
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Correo</Label>
                <Input
                  value={form.correo ?? ""}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dirección</Label>
                <Input
                  value={form.direccion ?? ""}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Información de la empresa contratista</Label>
                <Textarea
                  value={form.descripcion ?? ""}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder={"Ej:\nLPS — CONTRATISTA DE CLARO\nPERSONAL EN CAMPO: 30\nDespacho diario: ~17 despachos\nCobertura: Lima Norte, Comas, Los Olivos\n...toda la info que necesites"}
                  className="min-h-[140px] rounded-md border-border bg-background text-[13px] leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  El almacén es de LEMCORP. Aquí registras la empresa contratista a la que despachas (ej: LPS que trabaja para Claro).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <InfoRow label="Empresa" value={empresa.nombre} />
            {empresa.ruc && <InfoRow label="RUC" value={empresa.ruc} />}
            {empresa.direccion && <InfoRow label="Dirección" value={empresa.direccion} />}
            {empresa.telefono && <InfoRow label="Teléfono" value={empresa.telefono} />}
            {empresa.correo && <InfoRow label="Correo" value={empresa.correo} />}
            {empresa.descripcion && (
              <div className="px-4 py-3">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Información
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {empresa.descripcion}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal del almacén */}
      <div className="anim-slide-up overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">
              Personal del almacén
              <span className="ml-1.5 text-[12px] tabular-nums text-muted-foreground">{miembros.length}</span>
            </h2>
          </div>
          {puedeGestionarPersonal && (
            <button
              onClick={openCreateMiembro}
              className="press inline-flex h-7 items-center gap-1 rounded-md bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90"
            >
              <Plus className="h-3.5 w-3.5" {...ICON_PROPS} />
              Añadir
            </button>
          )}
        </div>

        {miembros.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" {...ICON_PROPS} />
            <p className="text-[13px] font-medium text-foreground">Sin personal registrado</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {puedeGestionarPersonal
                ? "Añade a tu equipo: administradores, jefes, supervisores y almaceneros."
                : "El administrador añadirá al personal cuando corresponda."}
            </p>
            {puedeGestionarPersonal && (
              <button
                onClick={openCreateMiembro}
                className="press mx-auto mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-[12px] font-medium text-background hover:bg-foreground/90"
              >
                <Plus className="h-3.5 w-3.5" {...ICON_PROPS} />
                Añadir primer miembro
              </button>
            )}
          </div>
        ) : (
          <div>
            {ROLES.map((rol) => {
              const lista = byRol[rol] ?? [];
              if (lista.length === 0) return null;
              return (
                <div key={rol}>
                  <div className="border-b border-border bg-muted/30 px-4 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {ROL_META[rol].label}
                      <span className="ml-1.5 tabular-nums">{lista.length}</span>
                    </p>
                  </div>
                  <ul className="divide-y divide-border">
                    {lista.map((m) => (
                      <li key={m.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[12px] font-medium text-foreground">
                          {m.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="truncate text-[13px] font-medium text-foreground">{m.nombre}</p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {ROL_META[m.rol].short}
                            </span>
                            {(m.permisosExtra?.length || m.permisosRevocados?.length) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                <Shield className="h-2.5 w-2.5" {...ICON_PROPS} />
                                Permisos personalizados
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {m.correo && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" {...ICON_PROPS} />
                                <span className="truncate">{m.correo}</span>
                              </span>
                            )}
                            {m.telefono && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" {...ICON_PROPS} />
                                {m.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                        {puedeGestionarPersonal && (
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {puedeGestionarPermisos && m.rol !== "administrador" && (
                              <button
                                onClick={() => openPermisos(m)}
                                className="press rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Permisos"
                              >
                                <Shield className="h-3.5 w-3.5" {...ICON_PROPS} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditMiembro(m)}
                              className="press rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                            </button>
                            <button
                              onClick={() => deleteMiembro(m.id)}
                              className="press rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de permisos */}
      <Dialog open={!!permisosDialog} onOpenChange={(v) => !v && setPermisosDialog(null)}>
        <DialogContent className="gap-0 rounded-lg border-border bg-background p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Shield className="h-4 w-4 text-foreground" {...ICON_PROPS} />
              Permisos de {permisosDialog?.nombre}
            </DialogTitle>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Rol: <span className="font-medium text-foreground">{permisosDialog ? ROL_META[permisosDialog.rol].label : ""}</span>
            </p>
          </DialogHeader>
          {permisosDialog && (
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <p className="mb-3 text-[12px] text-muted-foreground">
                Los permisos del rol ({ROL_META[permisosDialog.rol].label}) se aplican por defecto. Puedes otorgar permisos adicionales o revocar los del rol.
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {(Object.keys(PERMISO_META) as Permiso[]).map((p) => {
                  const meta = PERMISO_META[p];
                  const delRol = (PERMISOS_POR_ROL[permisosDialog.rol] ?? []).includes(p);
                  const esExtra = permisosExtra.includes(p);
                  const esRevocado = permisosRevocados.includes(p);
                  const efectivo = delRol ? !esRevocado : esExtra;
                  return (
                    <li key={p} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
                          {delRol && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Del rol
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                      </div>
                      <div className="shrink-0">
                        {delRol ? (
                          // Si es del rol, solo se puede revocar/quitar revocación
                          <button
                            onClick={() => togglePermisoRevocado(p)}
                            className={cn(
                              "press inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                              esRevocado
                                ? "border-border bg-muted text-muted-foreground"
                                : "border-foreground bg-foreground text-background"
                            )}
                          >
                            {esRevocado ? <XIcon className="h-3 w-3" {...ICON_PROPS} /> : <Check className="h-3 w-3" {...ICON_PROPS} />}
                            {esRevocado ? "Revocado" : "Activo"}
                          </button>
                        ) : (
                          // Si no es del rol, se puede otorgar/quitar
                          <button
                            onClick={() => togglePermisoExtra(p)}
                            className={cn(
                              "press inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                              esExtra
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {esExtra ? <Check className="h-3 w-3" {...ICON_PROPS} /> : <Plus className="h-3 w-3" {...ICON_PROPS} />}
                            {esExtra ? "Otorgado" : "Otorgar"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <DialogFooter className="border-t border-border px-5 py-3 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setPermisosDialog(null)}
              className="h-9 rounded-md border-border bg-background hover:bg-muted"
            >
              Cancelar
            </Button>
            <button
              onClick={savePermisos}
              className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background hover:bg-foreground/90"
            >
              <Save className="h-3.5 w-3.5" {...ICON_PROPS} />
              Guardar permisos
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog miembro */}
      <Dialog open={miembroDialog} onOpenChange={setMiembroDialog}>
        <DialogContent className="gap-0 rounded-lg border-border bg-background p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-[15px] font-semibold text-foreground">
              {editingMiembro ? "Editar" : "Añadir"} personal del almacén
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                <Input
                  value={miembroForm.nombre}
                  onChange={(e) => setMiembroForm({ ...miembroForm, nombre: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Rol</Label>
                <Select value={miembroForm.rol} onValueChange={(v) => setMiembroForm({ ...miembroForm, rol: v as Rol })}>
                  <SelectTrigger className="h-9 rounded-md border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border-border bg-background">
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROL_META[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Teléfono</Label>
                <Input
                  value={miembroForm.telefono}
                  onChange={(e) => setMiembroForm({ ...miembroForm, telefono: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Correo</Label>
                <Input
                  value={miembroForm.correo}
                  onChange={(e) => setMiembroForm({ ...miembroForm, correo: e.target.value })}
                  className="h-9 rounded-md border-border bg-background"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border px-5 py-3 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setMiembroDialog(false)}
              className="h-9 rounded-md border-border bg-background hover:bg-muted"
            >
              Cancelar
            </Button>
            <button
              onClick={saveMiembro}
              disabled={!miembroForm.nombre.trim()}
              className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
            >
              {editingMiembro ? "Guardar" : "Añadir"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-24 shrink-0 text-[12px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex-1 text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
