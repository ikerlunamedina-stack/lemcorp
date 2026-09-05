# Task 6-d — Redesign despachos-view & horario-view (minimalist Apple/Linear/Stripe)

## What I did
- Read sibling records `agent-ctx/6-a-redesigner.md` (inventario-view) and `agent-ctx/6-c-redesigner.md` (pistolear-view) to align on conventions (ICON_PROPS `strokeWidth: 1.5`, primary action = `bg-foreground text-background`, hairline `divide-y divide-border`, no `bg-primary`, no gradients, no neon, no aurora).
- Reviewed `globals.css` to confirm available CSS vars (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--destructive`) and animation utilities (`anim-fade-in`, `anim-slide-up`).
- Read `/home/z/my-project/src/components/lem/despachos-view.tsx` (571 lines) in 2 chunks and identified ALL logic to preserve.
- Read `/home/z/my-project/src/components/lem/horario-view.tsx` (537 lines) in 1 chunk and identified ALL logic to preserve.
- Rewrote the JSX of both files applying the new minimalist design language. **All business logic, store hooks, state, handlers, memo computations, dialogs, and side effects are preserved verbatim.** Only one UI-only state (`selectedDia`) was added to `horario-view.tsx` to support the spec's requested text-tabs layout — it does not touch store/handlers/IA.

## Logic preserved (untouched) — despachos-view.tsx
- imports (kept verbatim incl. unused `Package`, `FileSpreadsheet`, `Save`, `TrendingUp`, `Clock`)
- `DespachoImportado` interface
- helpers: `isSameDay`, `fechaCorta`, `diaSemana`
- useStore hooks: `products`, `despachos`, `findProductBySku`, `registrarDespachosBulk`, `deleteDespacho`
- state: `query`, `bulkOpen`, `bulkText`, `importingExcel`, `filterToday`, `expandedDay`, `expandedTecnico`, `analizando`, `resultadoIA`, `fileInputRef`
- memo: `lineasParseadas` (parses pasted lines by `\t` / `|` / `,`+`*`), `validacion` (validates SKU against catalog + simulates stock decrement), `filteredDespachos`, `porDia`, `porDiaYTecnico`
- derived stats: `totalDespachado`, `despachosHoy`, `totalDespachadoHoy`, `tecnicosUnicos`, `diasConDespachos`
- handlers: `openBulk`, `analizarYRegistrar` (with the **1500ms setTimeout** IA simulation and the **3000ms setTimeout** to close after success), `handleExcelUpload` (FormData POST to `/api/import-excel`, sets bulkText from `tecnico|destino|sku*cantidad`)
- the bulk dialog: formatos hint, textarea, live validation preview with valid/invalid counts, final IA result with `porTecnico` desglose
- the 5-card StatCard row + `StatCard` sub-component signature (still accepts `highlight` prop)

## Logic preserved (untouched) — horario-view.tsx
- imports (kept verbatim incl. unused `Sun`, `Moon`, `Coffee`, `X`, `Play`)
- `DIAS_ORDEN`, `TIPO_ICONO` maps
- helpers: `a12h`, `a24h`, `hoyDiaSemana`, `ahora24h`
- useStore hooks: `horario`, `addHorarioItem`, `updateHorarioItem`, `deleteHorarioItem`
- state: `open`, `editingId`, `dia`, `horaInicio`, `horaFin`, `actividad`, `tipo`, `pulseKey`
- `useEffect` interval that re-renders every 5s so the "ocurriendo" status updates in real time (kept verbatim; `void pulseKey;` consumes the value)
- memo: `porDia` (grouped by day + sorted by `horaInicio`)
- handlers: `resetForm`, `openCreate`, `openEdit`, `handleSave` (with `!act` and `horaInicio >= horaFin` validations), `handleDelete`
- the create/edit Dialog (día select, hora inicio/fin inputs with live 12h preview, actividad input with Enter-to-save, tipo select with icon, TTS reminder)
- `KPI` sub-component signature (still accepts `highlight` prop)
- **NEW UI-only state** `selectedDia` (default = `hoyDiaSemana()`) for the requested text-tabs layout — does NOT touch store/handlers/business logic.

## Visual changes — despachos-view.tsx
1. Header: small uppercase label "Operaciones" + big title `text-[28px] font-semibold tracking-tight` + actions on the right (Subir Excel outline, Pegar despachos `bg-foreground text-background`).
2. Stats: hairline grid via `grid-cols-... gap-px bg-border` with each cell `bg-background px-4 py-3` (no individual rounded cards, no shadows, no `bg-primary/5` highlight — highlighted cell uses subtle `bg-muted/40`).
3. Search input: `h-9 rounded-md border-border bg-background` with line-art `Search` icon.
4. Filter chip "Solo hoy / Ver todos": `border border-border rounded-md px-3 py-1 text-[12px]`, active = `border-foreground bg-foreground text-background`.
5. Historial por día: replaced bordered shadowed cards with a single `rounded-lg border border-border bg-background` container using `divide-y divide-border` hairlines. Each day row is a clean button (chevron + date + tiny `Hoy` indicator with `h-1.5 w-1.5 rounded-full bg-foreground` dot, not a big colored badge).
6. Day stats inline (despachos/destinatarios/productos/unidades) all neutral `text-foreground tabular-nums` — no `bg-primary/10` highlight pills.
7. Per-técnico nested rows: hairline `divide-y divide-border`, line-art `User` icon in muted, total units in plain text (no `bg-primary/10` chip).
8. Despacho rows table: `divide-y divide-border`, plain producto + SKU mono, destino as plain inline text with line-art `MapPin` (removed `bg-cyan-500/15 text-cyan-300` pill), time in muted tabular-nums, cantidad as plain text with tiny `h-1 w-1 bg-muted-foreground` dot (removed `bg-rose-500/15 text-rose-400` badge).
9. Row delete button: `opacity-0 group-hover:opacity-100`, `hover:bg-destructive/10 hover:text-destructive`.
10. Empty state: `rounded-lg border border-dashed border-border bg-background` with line-art `ClipboardPaste` icon in `text-muted-foreground/40`.
11. Bulk dialog: `DialogContent` uses `p-0 gap-0 rounded-lg`; sections split by `border-b border-border` / `border-t border-border`. Title with neutral `ClipboardPaste` icon (was `text-primary` Sparkles). Removed all `bg-emerald-500/15 text-emerald-400`, `bg-rose-500/15 text-rose-400`, `bg-cyan-500/15 text-cyan-300` colored pills — replaced with plain inline text + line-art icons (`Check` in foreground, `AlertTriangle` in `text-destructive`).
12. Final IA result: neutral `border-border bg-muted/30` for success (was emerald), `border-destructive/30 bg-destructive/5` for failure. Desglose por destinatario uses hairline `grid gap-px bg-border` with `bg-background` cells (no `bg-primary/10` chip).
13. Footer: sticky `bg-background`, `border-t border-border`; Cancel = outline, primary action "Analizar y registrar" = `bg-foreground text-background hover:bg-foreground/90 shadow-none` (NOT `btn-spacecom`, NOT `bg-primary`).
14. `StatCard` sub-component: hairline grid cell — no rounded card, no shadow; `highlight` prop kept for API compatibility but only changes bg to subtle `bg-muted/40`.

## Visual changes — horario-view.tsx
1. Header: small uppercase label "Operaciones" + big title `text-[28px] font-semibold tracking-tight` + "Nueva actividad" button on the right (`bg-foreground text-background hover:bg-foreground/90 shadow-none`).
2. Clock display: replaced the big colored circle (`bg-primary/10` + `text-primary` pulsing `Clock`) and `anim-horario-shimmer` aurora with a minimal `rounded-lg border border-border bg-background px-4 py-3` row — small uppercase date label + big `text-[28px] font-semibold tabular-nums` time on the left, single line-art `Clock` icon (`strokeWidth={1.5}`, `text-muted-foreground`) on the right. No shimmer, no pulse, no big colored tile.
3. KPIs: hairline `grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-lg border border-border` with each cell `bg-background px-4 py-3`. "Hoy" KPI uses subtle `bg-muted/40` (no `bg-primary/5`/`border-primary/40`). `KPI` signature unchanged.
4. **Day selector: replaced the grid-of-day-cards with text tabs (per spec).** The strip uses `border-b border-border` and each day is `border-b-2 -mb-px px-1 py-2.5 text-[12px] font-medium whitespace-nowrap`; active = `border-foreground text-foreground`, inactive = `border-transparent text-muted-foreground hover:text-foreground`. Today is marked with a small `h-1.5 w-1.5 rounded-full bg-foreground` dot next to the label. Item count is shown as a small muted tabular-nums number. Horizontal scroll on small screens via `overflow-x-auto`.
5. **Selected day items: hairline rows** in a single `rounded-lg border border-border bg-background divide-y divide-border` container (replaces `rounded-2xl` shadowed cards inside a grid). Each row has: condensed time range (mono, two lines for inicio/fin in `tabular-nums`), a status column (small `bg-muted-foreground/40` dot for upcoming, animated `bg-foreground` 2px dot for "ocurriendo", line-art `Check` for "pasado" — NOT the big `bg-primary text-primary-foreground BellRing` "Ahora" badge or the `bg-muted` "Hecho" badge), a line-art type icon in muted (was colored `var(--primary)`/`oklch` orange/blue/green tile), the activity name + type label + inline status suffix ("· Ahora"/"· Hecho"), and hover-revealed edit/delete buttons.
6. Past items: subtle `opacity-50` (kept from original behavior).
7. Empty state for the selected day: minimal `rounded-lg border border-dashed border-border bg-background` message.
8. Global empty state (when `horario.length === 0`): same hairline minimal treatment with a "Agregar actividad" primary button (`bg-foreground`).
9. Dialog: `DialogContent p-0 gap-0 rounded-lg`, sections split by `border-b border-border` / `border-t border-border`. Title icon is line-art in `text-foreground` (was `text-primary`). Labels use `text-[11px] uppercase tracking-wider text-muted-foreground`. Inputs/selects use `h-9 rounded-md border-border bg-background`. Live 12h preview text uses `text-[10px] text-muted-foreground` (was `text-primary`). The TTS reminder is in a `rounded-md border border-border bg-muted/30` (was `bg-muted/40` with `text-primary` BellRing). Footer: Cancel outline + primary `bg-foreground text-background` action button.
10. Icons: defined `const ICON_PROPS = { strokeWidth: 1.5 } as const;` and spread onto every lucide-react icon (including inside `SelectItem` and `KPI`). Removed `anim-horario-pulse`, `anim-horario-breathe`, `anim-horario-glow`, `anim-horario-shimmer`, `anim-horario-slide-in` animation classes (no neon/aurora). Used the standard `anim-fade-in` and `anim-slide-up` utilities for entrance animations.
11. No `bg-primary` anywhere in the JSX. No gradients, no neon, no aurora, no flashy shadows. Only neutral `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, plus `bg-destructive`/`text-destructive` for the error states in despachos IA validation.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → no errors in `despachos-view.tsx` or `horario-view.tsx` (errors only in unrelated `examples/`, `skills/`, and `src/app/api/ia/route.ts`).
- Initial tsc run flagged `title="Hecho"` on the `<Check>` icon (LucideProps doesn't accept `title`) — removed; re-checked, no further errors.
