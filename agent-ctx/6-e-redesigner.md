# Task 6-e — Redesign bloc, empresa, notificaciones views (minimalist Apple/Linear/Stripe)

## What I did
- Read sibling records `agent-ctx/6-c-redesigner.md` and `agent-ctx/6-d-redesigner.md` to align on conventions (ICON_PROPS `strokeWidth: 1.5`, primary action = `bg-foreground text-background`, hairline `divide-y divide-border`, no `bg-primary` fills, no gradients, no neon, no aurora, no flashy shadows, page header = small uppercase label + big title `text-[28px] font-semibold tracking-tight` + actions right).
- Reviewed `globals.css` to confirm available CSS vars (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--destructive`) and animation utilities (`anim-fade-in`, `anim-slide-up`).
- Read all three target files completely (`bloc-view.tsx` 107 lines, `empresa-view.tsx` 398 lines, `notificaciones-view.tsx` 186 lines) and identified ALL logic to preserve.
- Rewrote the JSX of all three files applying the new minimalist design language. **All business logic, store hooks, state, handlers, dialogs, derived values, side-effects and sub-components are preserved verbatim.** Only the visual layer (className, layout, container structure) was touched.

## Logic preserved (untouched)

### bloc-view.tsx
- imports: `useState`, `useStore`, `cn`, `Textarea` (removed `StickyNote`, `PinOff`, `Button` that became unused after redesign)
- useStore hooks: `notas`, `addNota`, `togglePinNota`, `deleteNota`
- state: `texto`
- handlers: `handleAdd` (with the same `!texto.trim()` guard and `setTexto("")` reset)
- the `sorted` array (pinned-first then fecha-desc) — verbatim
- the Ctrl/Cmd+Enter `onKeyDown` behavior preserved verbatim on the textarea
- the empty-state condition `sorted.length === 0`
- the date formatter `new Date(n.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })` — verbatim
- the `togglePinNota(n.id)` and `deleteNota(n.id)` calls — verbatim
- Note: the file does NOT have an "edit" handler in the store (only `addNota` / `togglePinNota` / `deleteNota` exist), so per the CRITICAL "do not add/change logic" rule, the redesign keeps the existing add/pin/delete functionality and does not introduce a new edit dialog. The "edit in dialog" hint in the task spec describes the desired layout for components that already have edit logic; bloc-view does not, so I preserved the existing behavior exactly.

### empresa-view.tsx
- imports: `useState`, lucide icons (`Building2`, `Users`, `Plus`, `Pencil`, `Trash2`, `Mail`, `Phone`, `Save`, `X`, `Truck`, `Shield`, `Check`, `X as XIcon`), `useStore`, `PERMISO_META`, `PERMISOS_POR_ROL`, `ROL_META`, `Permiso`, `Rol`, `MiembroEquipo`, `cn`, `Button`, `Input`, `Label`, `Textarea`, `Select*`, `Dialog*` — all kept verbatim
- `ROLES` constant order: `["jefe_operaciones", "supervisor", "almacenero", "administrador"]` — preserved
- useStore hooks: `empresa`, `updateEmpresa`, `miembros`, `addMiembro`, `updateMiembro`, `deleteMiembro`, `setPermisosMiembro`, `tienePermiso`
- derived perms: `puedeGestionarPersonal`, `puedeGestionarPermisos`
- state: `editing`, `form`, `miembroDialog`, `editingMiembro`, `miembroForm`, `permisosDialog`, `permisosExtra`, `permisosRevocados`
- handlers: `saveEmpresa`, `openCreateMiembro`, `openEditMiembro`, `saveMiembro`, `openPermisos`, `savePermisos`, `togglePermisoExtra` (with the cross-clear of `permisosRevocados`), `togglePermisoRevocado` (with the cross-clear of `permisosExtra`) — all preserved verbatim
- the `byRol` grouping loop — preserved
- the role-section skip (`if (lista.length === 0) return null`) — preserved
- the permisos dialog permission-by-permission loop with the `delRol` / `esExtra` / `esRevocado` / `efectivo` derivation — preserved verbatim
- the same "if delRol → togglePermisoRevocado, else → togglePermisoExtra" branch logic — preserved
- the miembro dialog form fields and validations (incl. `!miembroForm.nombre.trim()`) — preserved
- the InfoRow sub-component signature — preserved (only the JSX was redesigned)
- The corner-case note from the original: `correo: miembroForm.correo || undefined, telefono: miembroForm.telefono || undefined` empty-string-to-undefined coercion — preserved

### notificaciones-view.tsx
- imports: `useStore`, lucide icons (`BellRing`, `AlertTriangle`, `Info`, `Package`, `Bell`, `Check`, `Trash2`, `CheckCheck`) — all preserved (removed `Button` and the now-unused `cn` import)
- helper `tiempoRelativoLima(ts)` — preserved verbatim
- the `tipoConfig` map (recordatorio, horario, stock, alerta, info with their icon + label) — preserved verbatim
- useStore hooks: `notificaciones`, `markNotificacionLeida`, `clearNotificaciones`, `clearNotificacionesLeidas`, `products`, `recordatorios` — preserved
- derived arrays: `noLeidas`, `leidas`, `bajoStock` (filter on `p.minStock && p.minStock > 0 && p.quantity <= p.minStock`), `recordatoriosPendientes` (`!r.disparado`) — preserved verbatim
- the date formatter for recordatorios `new Date(r.cuando).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })` — preserved verbatim
- the empty-state condition `notificaciones.length === 0 && bajoStock.length === 0 && recordatoriosPendientes.length === 0` — preserved (just refactored into a local `hasAny` boolean to keep the same boolean expression)
- the `tipoConfig[n.tipo] || tipoConfig.info` fallback — preserved
- the `markNotificacionLeida(n.id)` call — preserved

## Visual changes — bloc-view.tsx
1. Header: small uppercase label "Apuntes" + big title "Bloc" `text-[28px] font-semibold tracking-tight` + 1-line muted subtitle. Removed the `StickyNote` icon that was inside the title.
2. Add panel: clean single `rounded-lg border border-border bg-background` container — the textarea spans the top with no internal padding/border, then a `border-t border-border` footer row with the "Ctrl+Enter para guardar" hint on the left and the primary "Añadir nota" button on the right (`bg-foreground text-background hover:bg-foreground/90`, line-art `Plus` icon, no `bg-primary`, no `rounded-xl`).
3. Notes list: **hairline list** in a single `rounded-lg border border-border bg-background` container with `divide-y divide-border` rows (replaces the old grid of `rounded-2xl` cards with `border-primary/30 bg-primary/5` for pinned and `shadow-sm`/`hover:shadow-md` for unpinned).
4. Header row of the list shows the count and a small inline "Fijadas primero" indicator with a tiny `h-1.5 w-1.5 rounded-full bg-foreground` dot when at least one note is pinned.
5. Each row: **small dot indicator** on the left (`h-1.5 w-1.5 rounded-full bg-foreground` when pinned, transparent when not), then the note text + date (tabular-nums muted), then hover-revealed pin/delete buttons (`opacity-0 group-hover:opacity-100`).
6. Pin button: always shows `<Pin>` icon (line-art, `strokeWidth={1.5}`) with conditional color (foreground when pinned, muted otherwise). Removed `PinOff` alternate icon (visual-only change; `togglePinNota` handler unchanged).
7. Delete button: `hover:bg-destructive/10 hover:text-destructive`.
8. Empty state: `rounded-lg border border-dashed border-border bg-background` with the same message.
9. Animations: outer wrapper `anim-fade-in`, header / add panel / list `anim-slide-up` (with `animationDelay` capped at 240ms).
10. No `bg-primary`, no gradients, no shadows, no neon anywhere.

## Visual changes — empresa-view.tsx
1. Header: small uppercase label "Organización" + big title `text-[28px] font-semibold tracking-tight` + 1-line muted subtitle (kept the LPS/LEMCORP note).
2. Empresa contratista block: a single `rounded-lg border border-border bg-background` container split by `border-b border-border`. Header row holds the title (line-art `Truck` icon + "Empresa contratista / Cliente") and the Edit / Save / Cancel buttons on the right.
3. Edit-mode buttons: primary "Guardar" = `bg-foreground text-background hover:bg-foreground/90` with line-art `Save` icon (NOT `bg-primary`); Cancel = `border border-border bg-background hover:bg-muted` with line-art `X`. Edit button = same outline style with `Pencil` icon (was a tiny icon-only `variant="ghost"`).
4. Edit form: 2-col grid with `h-9 rounded-md border-border bg-background` inputs. Labels rendered as small uppercase `text-[11px] uppercase tracking-wider text-muted-foreground`. Removed `rounded-xl` style from inputs/textarea.
5. Read mode: `InfoRow` redesigned as a hairline `divide-y divide-border` list inside the container — each row is `flex items-start gap-3 px-4 py-3` with a fixed-width `w-24` uppercase label and a flex-1 medium-weight value. The "Información" descripción block stays at the bottom inside the same hairline list.
6. Personal del almacén block: another single `rounded-lg border border-border bg-background` container. Header row holds the line-art `Users` icon + "Personal del almacén" + inline `tabular-nums` count, and the "Añadir" button (`bg-foreground text-background`).
7. Members grouped by role: each role group now has a thin section header row `border-b border-border bg-muted/30 px-4 py-2` with the role label + count in small uppercase muted text, followed by a **hairline `divide-y divide-border` list** of members (replaces the grid of 3-col `rounded-xl` member cards with colored avatar tiles).
8. Member row: small round avatar `h-8 w-8 rounded-full border border-border bg-background` with the first letter (no more `bg-primary` fill — neutral across all roles), then the name + inline role badge as **small muted text** `text-[11px] text-muted-foreground` showing `ROL_META[m.rol].short` (NOT a colored pill), and the "Permisos personalizados" indicator as small uppercase muted text with a tiny line-art `Shield` icon (was an amber `bg-amber-500/15 text-amber-300` pill). Contact info below in muted `text-[11px]` with line-art `Mail` / `Phone` icons. Edit / Permisos / Delete buttons revealed on hover (`opacity-0 group-hover:opacity-100`).
9. Empty state for members: clean centered message with line-art `Users` icon in `text-muted-foreground/40` + the "Añadir primer miembro" primary button when permitted.
10. Permisos dialog: `DialogContent` uses `p-0 gap-0 rounded-lg border-border bg-background`. Header split by `border-b border-border`, scrollable body `max-h-[60vh] overflow-y-auto`, footer split by `border-t border-border`. Title icon is line-art `Shield` in `text-foreground` (was `text-primary`). Permissions rendered as a **hairline `divide-y divide-border` list** in a `rounded-md border border-border` container (replaces the old `rounded-xl` cards with emerald `border-emerald-500/30 bg-emerald-500/5` for active / `bg-muted/20` for inactive). Each row shows the permission label + a tiny uppercase "Del rol" tag for role-default perms (was a `bg-primary/10 text-primary` pill). Active/Revocado/Otorgado/Otorgar toggles are simple `h-7` bordered buttons: active = `border-foreground bg-foreground text-background`, inactive = `border-border bg-muted text-muted-foreground` or `border-border bg-background hover:bg-muted`. Removed all emerald/red/primary color tints from the rows themselves — the only color signal is the active/inactive button state.
11. Miembro dialog: same `p-0 gap-0 rounded-lg` shell, header / body / footer split by `border-b` / `border-t`. Form uses 2-col grid with `h-9 rounded-md border-border bg-background` inputs and small uppercase labels. Cancel = outline, primary action = `bg-foreground text-background hover:bg-foreground/90` (NOT `bg-primary`).
12. Icons: defined `const ICON_PROPS = { strokeWidth: 1.5 } as const;` and spread onto every lucide-react icon. No `bg-primary`, no `text-primary`, no `bg-amber-500/15 text-amber-300` colored pills anywhere in the JSX.

## Visual changes — notificaciones-view.tsx
1. Header: small uppercase label "Avisos" + big title "Notificaciones" `text-[28px] font-semibold tracking-tight` + 1-line muted summary with `tabular-nums` counters. "Limpiar leídas" and "Borrar todo" actions on the right, both as small `h-8` outline buttons (`border border-border bg-background hover:bg-muted`). "Borrar todo" stays muted by default and turns `text-destructive` on hover (was `text-destructive` by default).
2. Bajo stock alerts: **hairline list** in a `rounded-lg border border-border bg-background` container with `divide-y divide-border` rows (replaces the old `rounded-md border border-border/40 p-2` cards inside a `space-y-1.5`). Section header row uses small uppercase muted text with a line-art `AlertTriangle` icon + the count in tabular-nums on the right.
3. Each bajo-stock row: **small red dot** `h-1.5 w-1.5 rounded-full bg-destructive` on the left (NOT a big `bg-red-500/10` icon tile), then the product name in `text-foreground` font-medium + SKU in muted mono tabular-nums, then the quantity on the right (red `text-destructive` font-semibold tabular-nums + "/ X mín" muted).
4. Recordatorios pendientes: hairline list in the same container style. Each row has a small `bg-foreground/60` dot, the reminder text in `text-foreground`, and the date in muted tabular-nums on the right.
5. "Sin leer" and "Leídas" sections: small uppercase muted section header + a single `rounded-lg border border-border bg-background` container with `divide-y divide-border` hairline rows (replaces the old `space-y-2` of `rounded-lg border border-border bg-card p-3 shadow-sm` cards with the big 9×9 icon tiles).
6. Each notification row: small status dot on the left (`bg-foreground` for unread, `bg-muted-foreground/40` for read), then a line-art type icon `h-4 w-4 text-muted-foreground` (was a colored tile inside `bg-accent`), then the type label + relative time in muted uppercase/`tabular-nums`, the title in `text-foreground` font-medium, and the body in `text-muted-foreground`. The "mark as read" `Check` button is hover-revealed (`opacity-0 group-hover:opacity-100`) for unread rows.
7. Read notifications rendered with `opacity-60` (matches the previous `opacity-70` behavior — slightly stronger dim for clearer separation).
8. Empty state: `rounded-lg border border-dashed border-border bg-background` with the line-art `Bell` icon in `text-muted-foreground/40` (no `shadow-sm`, no `bg-card`).
9. Icons: defined `const ICON_PROPS = { strokeWidth: 1.5 } as const;` and spread onto every lucide-react icon. Removed unused `Button` and `cn` imports that became unused after the redesign. No `bg-primary`, no `bg-accent` icon tiles, no `shadow-sm` cards, no gradients, no neon, no aurora anywhere.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → no errors in `bloc-view.tsx`, `empresa-view.tsx`, or `notificaciones-view.tsx` (file-specific grep returned no matches).
- Dev log was not present at `/home/z/my-project/dev.log` at verification time; lint and tsc clean confirm the redesign compiles.
