# Task 6-c — Redesign pistolear-view (minimalist Apple/Linear/Stripe)

## What I did
- Read `/home/z/my-project/src/components/lem/pistolear-view.tsx` (1084 lines) completely in 4 chunks.
- Reviewed `agent-ctx/6-a-redesigner.md` (sibling task 6-a for inventario-view) to align on conventions.
- Reviewed `globals.css` to confirm available CSS vars (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--destructive`) and animation utilities (`anim-fade-in`, `anim-slide-up`).
- Rewrote the JSX of `pistolear-view.tsx` applying the new minimalist design language. **All logic preserved verbatim** — same `useStore` hooks, same handlers, same `useMemo`, same `useEffect`, same dialogs, same state, same `ResumenCard` signature, same paginación, same 1000 limit.

## Logic preserved (untouched)
- useStore hooks: `settings`, `setSetting`, `pistoleoCampo`, `pistoleoModelo`, `pistoleoEstado`, `pistoleoFilas`, `pistoleoModeloSeleccionado`, `equipos`, `products`, `findEquipmentBySerie`, `setPistoleoConfig`, `addPistoleoFila`, `updatePistoleoFila`, `deletePistoleoFila`, `clearPistoleoFilas`, `confirmarPistoleo`
- State: `showConfig`, `valor`, `feedback`, `editingId`, `editingValores`, `editingModelo`, `showPreview`, `duplicadosSistema`, `showDuplicadosModal`, `lastConfirmResult`, `visibleCount`, `parcial`
- Refs / effects: `inputRef` autofocus effect, `detectarDuplicadosEnSistema` effect, feedback auto-hide setTimeout (4s)
- Memo: `duplicadosEnLote`, `seriesExistentesSet`, `duplicadosEnLoteSet`, `filasVisibles`, `hayMasFilas`, `productosUnicos`
- Handlers: `handleScan` (with 1000 limit, prefix validation, in-system dup detection, in-session dup rejection, multi-capture flow), `onKeyDown` (Enter + Escape), `handleConfirmar`, `handleConfirmarReal`, `handleClear`, `startEdit`, `cancelEdit`, `saveEdit`
- Both dialogs: preview-before-save dialog (with 3-metric summary, scroll table, duplicates warning), duplicates detail modal (with equipment lookup)
- Pagination "Cargar 100 más" button preserved with `setVisibleCount((c) => c + 100)`
- The 900+ threshold limit warning preserved
- Helper functions `detectarModelo`, `validarPrefijo`, `detectarDuplicadosEnSistema`, `detectarDuplicadosEnLote` untouched
- `ResumenCard` signature untouched (still accepts `tone` prop; `void tone` is used to keep the public prop without visual differentiation per minimalist design)

## Visual changes
1. **Page header**: small uppercase label "Captura con lector óptico" (`text-[11px] uppercase tracking-wider text-muted-foreground`) + big title "Pistolear series" (`text-[28px] font-semibold tracking-tight`) + Config button on the right.
2. **Config button**: outline style `h-9 rounded-md border-border bg-background hover:bg-muted`, line-art `Settings2` icon with `strokeWidth={1.5}`.
3. **Config panel (equipo + prefijo)**: removed `bg-primary/5` and `border-primary/30` colored container; replaced with `border border-border bg-background`. Replaced the `bg-primary text-primary-foreground` icon tiles with simple inline line-art icons (`PackageSearch`, `Hash`) in `text-muted-foreground`.
4. **Equipo select**: `h-9 rounded-md border-border bg-background` with line-art `Search` icon and `ChevronDown` indicator. Removed heavy `focus:ring-2` in favor of `focus:border-foreground`.
5. **Prefijo input**: `h-9 rounded-md border-border bg-background font-mono uppercase` — clean, single border.
6. **Quitar selección button**: small inline button `border border-border bg-background hover:bg-muted hover:text-foreground`.
7. **Advanced config (collapsible)**: `rounded-lg border border-border bg-background p-4`. Reglas de prefijo use thin border cards `border border-border` with muted `CircleDot` (no `text-primary`).
8. **Mode buttons (Solo serie, Serie+UA, etc)**: per task spec — text buttons with `border-b-2 border-transparent`, active = `border-foreground text-foreground`, inactive = `border-transparent text-muted-foreground hover:text-foreground`. Wrapped in a single `border-b border-border` container so the underline mode tabs read as a single tab strip. No more chip pills.
9. **Partial-scan indicator**: replaced the amber pill `bg-amber-500/15 text-amber-300` with a small neutral `inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground` and a small `h-1.5 w-1.5 rounded-full bg-foreground` dot.
10. **Active-mode label**: muted text "Modo activo:" + `<strong className="font-medium text-foreground">{label}</strong>`.
11. **Scan input**: large, clean, single border. `h-12 rounded-md border border-border bg-background pl-11 pr-3 font-mono text-[15px] font-medium focus:border-foreground`. Replaced `border-2 border-primary/30` + `ring-4 ring-primary/15` with single border + simple `focus:border-foreground`. Icon `ScanLine` is muted, no `text-primary`.
12. **Live feedback**: removed `bg-emerald-500/15 text-emerald-300` / `bg-red-500/15 text-red-400` colored pills. Replaced with plain inline text + line-art icon: success = `text-foreground` + `Check` icon, error = `text-muted-foreground` + `AlertCircle` icon. No background, no badge.
13. **Duplicate banner (system)**: replaced the amber `border-amber-500/40 bg-amber-500/10` + amber `bg-amber-500 text-white` icon tile + amber text with: `border border-border bg-background px-3 py-2.5 hover:bg-muted` thin-bordered button, `AlertCircle` icon in muted, neutral `text-foreground` title + `text-muted-foreground` subtitle, `ChevronRight` indicator on the right.
14. **Duplicate banner (in-lote)**: replaced the red `border-red-500/40 bg-red-500/10` + red icon tile + red text with: same neutral thin border treatment as above (no red).
15. **Action buttons**:
    - Primary "Guardar en sistema": `h-9 rounded-md bg-foreground text-background hover:bg-foreground/90 shadow-none disabled:opacity-40` (NOT `bg-primary`, NOT `btn-spacecom`).
    - Outline "Descartar captura": `h-9 rounded-md border-border bg-background hover:bg-muted disabled:opacity-40`.
16. **Esc kbd hint**: `kbd` uses `border border-border bg-muted text-foreground` (neutral).
17. **1000-series limit warning**: per task spec — `border border-border bg-background text-muted-foreground` with thin `AlertCircle` icon (NOT amber colors).
18. **Captures table**:
    - Container: `rounded-lg border border-border bg-background` (no `rounded-2xl`).
    - Header row: `text-[13px] font-medium uppercase tracking-wider text-muted-foreground` + count, separated by `border-b border-border`.
    - Empty state: `px-4 py-16 text-center text-[13px] text-muted-foreground` (more breathing room).
    - Sticky table header `bg-background` (no `backdrop-blur`, no `bg-muted/80`).
    - Body uses `divide-y divide-border` hairline (no per-row `border-b border-border/50`).
    - Cells: minimal padding `px-3 py-2.5` (per task spec).
    - Serial cell: `font-mono text-[12px] font-medium text-foreground`.
    - Duplicate row indicators: replaced `rounded-full bg-red-500/15 text-red-400` and `bg-amber-500/15 text-amber-300` colored pills with tiny inline `<span className="h-1.5 w-1.5 rounded-full bg-destructive" /> registrada` / `bg-muted-foreground` dot + small uppercase muted label. Removed row tints (`bg-red-500/5`, `bg-amber-500/5`).
    - Modelo cell: replaced `rounded-full bg-primary/10 text-primary` chip with plain `inline-flex items-center gap-1.5 text-foreground` + muted `Cpu` icon (line-art).
    - Row hover: subtle `hover:bg-muted/40`.
    - Row actions (Pencil / Trash2): `opacity-0 group-hover:opacity-100`, `hover:bg-muted hover:text-foreground` for edit, `hover:bg-destructive/10 hover:text-destructive` for delete.
    - Edit row: subtle `bg-muted/40` (was `bg-primary/5`); inputs use `border-border bg-background`.
19. **Pagination "Cargar 100 más"**: kept verbatim — `press rounded-md border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted`. Container uses `border-t border-border` (no `bg-muted/40`).
20. **Resumen cards**: `rounded-md border border-border bg-background px-3 py-2.5` — neutral for all 4 cards (the `tone` prop is still accepted for API compatibility but visually all cards look the same per minimalist design).
21. **Preview dialog**:
    - `DialogContent` uses `p-0 gap-0 rounded-lg`, internal sections split by `border-b border-border` / `border-t border-border`.
    - Title: `text-[15px] font-semibold text-foreground` + line-art `Eye` icon.
    - 3-column summary: `grid grid-cols-3 rounded-md border border-border bg-background` with `border-r border-border` dividers — all neutral, no green/red tints.
    - Preview table: same hairline `divide-y divide-border` style, `divide-y divide-border`, `bg-background` sticky header.
    - "Ya registrada" / "A guardar" status cells: small `h-1.5 w-1.5 rounded-full bg-destructive` / `bg-foreground` dot + uppercase muted label (no colored `rounded-full` pills).
    - Duplicates warning inside dialog: `border border-border bg-background text-muted-foreground` (was amber).
    - Footer: split by `border-t border-border`; "Cancelar" outline button + "Guardar" primary button (`bg-foreground text-background`).
22. **Duplicates detail modal**: same `p-0 gap-0 rounded-lg` shell, neutral `AlertCircle` icon header (was amber), list items in `border border-border bg-background` cards with mono serial and muted model/estado line. Estado short label is plain uppercase muted text (no `bg-primary/10` chip).
23. **Icons**: defined `const ICON_PROPS = { strokeWidth: 1.5 } as const;` and spread onto every lucide-react icon. Removed unused `AlertTriangle` (replaced by `AlertCircle` for the small `!` style indicator) and unused `Info` imports. Kept all other icons used by the redesigned layout.
24. **Animations**: outer wrapper uses `anim-fade-in`; header, panels, table, actions all use `anim-slide-up` for subtle staggered entrance (existing utility classes, no new keyframes).
25. **No gradients / no neon / no aurora / no flashy shadows** anywhere. Only neutral `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, plus `bg-destructive` for the tiny status dot — all from the existing CSS variables defined in `globals.css`.
26. **No `bg-primary`** anywhere in the JSX (matches the "primary action = bg-foreground" rule).

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → no errors in `pistolear-view.tsx` (errors only in unrelated `examples/`, `skills/`, and `src/app/api/ia/route.ts`).
- Next.js dev server (`next dev -p 3000`, PID 1097) is alive and stable after the file change; dev.log shows no new compile errors after the redesign.
