"use client";

import { useRef, useState } from "react";
import {
  LayoutDashboard,
  Wrench,
  Boxes,
  Hash,
  ClipboardPaste,
  Settings as SettingsIcon,
  FilePlus2,
  Upload,
  FileSpreadsheet,
  Trash2,
  Copy,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { TAG_META, type FileTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const TAG_ORDER: FileTag[] = ["inventario", "despachos", "equipos", "otro"];

export function Sidebar() {
  const files = useStore((s) => s.files);
  const activeFileId = useStore((s) => s.activeFileId);
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const openFile = useStore((s) => s.openFile);
  const createFile = useStore((s) => s.createFile);
  const importFile = useStore((s) => s.importFile);
  const deleteFile = useStore((s) => s.deleteFile);
  const renameFile = useStore((s) => s.renameFile);
  const duplicateFile = useStore((s) => s.duplicateFile);
  const { toast } = useToast();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState<FileTag>("inventario");
  const [query, setQuery] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const id = await importFile(file);
      toast({
        title: "Archivo importado",
        description: `${file.name} se agregó correctamente.`,
      });
      openFile(id);
    } catch (err) {
      toast({
        title: "No se pudo importar",
        description: "Verifica que sea un .xlsx, .xls o .csv válido.",
        variant: "destructive",
      });
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleCreate = () => {
    const id = createFile(newName.trim() || "Nuevo archivo", newTag);
    setNewOpen(false);
    setNewName("");
    toast({
      title: "Archivo creado",
      description: `${newName || "Nuevo archivo"} · ${TAG_META[newTag].short}`,
    });
    void id;
  };

  const products = useStore((s) => s.products);

  const counts = {
    inventario: files.filter((f) => f.tag === "inventario").length,
    despachos: files.filter((f) => f.tag === "despachos").length,
    equipos: files.filter((f) => f.tag === "equipos").length,
    productos: products.length,
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-primary text-primary-foreground press">
          <span className="text-[15px] font-semibold tracking-tight">L</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-[0.14em] text-foreground">
            LEMCORP
          </span>
          <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Gestor de Excel
          </span>
        </div>
      </div>

      <div className="lem-divider mx-4" />

      {/* Navegación principal */}
      <nav className="flex flex-col gap-1 px-3 py-3">
        <NavButton
          active={activeView === "resumen"}
          onClick={() => setActiveView("resumen")}
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Resumen"
          badge={counts.inventario + counts.despachos + counts.equipos || undefined}
        />
        <NavButton
          active={activeView === "inventario"}
          onClick={() => setActiveView("inventario")}
          icon={<Boxes className="h-4 w-4" />}
          label="Inventario"
          badge={counts.inventario || undefined}
        />
        <NavButton
          active={activeView === "despachosdia"}
          onClick={() => setActiveView("despachosdia")}
          icon={<ClipboardPaste className="h-4 w-4" />}
          label="Despachos del Día"
        />
        <NavButton
          active={activeView === "series"}
          onClick={() => setActiveView("series")}
          icon={<Hash className="h-4 w-4" />}
          label="Series"
        />
        <NavButton
          active={activeView === "equipos"}
          onClick={() => setActiveView("equipos")}
          icon={<Wrench className="h-4 w-4" />}
          label="Equipos"
          badge={counts.equipos || undefined}
        />
      </nav>

      <div className="lem-divider mx-4" />

      {/* Acciones */}
      <div className="flex flex-col gap-2 px-3 py-3">
        <Button
          onClick={() => setNewOpen(true)}
          className="press h-9 justify-start gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <FilePlus2 className="h-4 w-4" />
          Nuevo archivo
        </Button>
        <Button
          onClick={() => fileInput.current?.click()}
          variant="outline"
          className="press h-9 justify-start gap-2 rounded-xl border-border bg-transparent hover:bg-accent"
        >
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Lista de archivos */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1.5">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Archivos · {files.length}
        </span>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="h-8 rounded-lg border-border bg-muted/50 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              {files.length === 0
                ? "Aún no hay archivos. Crea o importa uno para empezar."
                : "Sin coincidencias."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((f) => (
              <li key={f.id}>
                <div
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 transition-colors press",
                    activeFileId === f.id && activeView === "editor"
                      ? "bg-accent"
                      : "hover:bg-accent/60"
                  )}
                  onClick={() => openFile(f.id)}
                >
                  <span className="emoji text-sm leading-none">
                    {TAG_META[f.tag].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {f.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {TAG_META[f.tag].short}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-md p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(f.id);
                          setRenameVal(f.name);
                        }}
                      >
                        <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateFile(f.id);
                          toast({ title: "Archivo duplicado" });
                        }}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(f.id);
                          toast({ title: "Archivo eliminado" });
                        }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pie de sidebar con Configuración */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={() => setActiveView("config")}
          className={cn(
            "press flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-colors",
            activeView === "config"
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          )}
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="flex-1 text-left">Configuración</span>
        </button>
        <p className="mt-2 px-3 text-[10px] text-muted-foreground">
          Datos guardados en este equipo
        </p>
      </div>

      {/* Modal nuevo archivo */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-4 w-4" />
              Nuevo archivo
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-name">Nombre</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Inventario Sucursal Norte"
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tipo de archivo</Label>
              <RadioGroup
                value={newTag}
                onValueChange={(v) => setNewTag(v as FileTag)}
                className="grid grid-cols-2 gap-2"
              >
                {TAG_ORDER.map((t) => (
                  <label
                    key={t}
                    htmlFor={`tag-${t}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors press",
                      newTag === t
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-accent/50"
                    )}
                  >
                    <RadioGroupItem value={t} id={`tag-${t}`} className="sr-only" />
                    <span className="emoji">{TAG_META[t].icon}</span>
                    <span className="font-medium">{TAG_META[t].short}</span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground">
                {TAG_META[newTag].hint}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} className="rounded-xl">
              Crear archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal renombrar */}
      <Dialog
        open={renameId !== null}
        onOpenChange={(o) => !o && setRenameId(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
          </DialogHeader>
          <Input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            className="rounded-xl"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameId(null)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (renameId) {
                  renameFile(renameId, renameVal.trim() || "Sin nombre");
                  setRenameId(null);
                }
              }}
              className="rounded-xl"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-semibold",
            active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
