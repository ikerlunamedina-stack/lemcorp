# Task 6-a — Redesign inventario-view (minimalist Apple style)

## What I did
- Read `/home/z/my-project/src/components/lem/inventario-view.tsx` completely.
- Reviewed `globals.css` to confirm available CSS variables (`--background`, `--foreground`, `--muted`, `--border`, `--primary`, `--card`, `--destructive`) and animation utilities (`anim-fade-in`, `anim-slide-up`).
- Rewrote the JSX of `inventario-view.tsx` applying the new minimalist Apple/Linear/Stripe design language. **All logic preserved verbatim** — same `useStore` hooks, same handlers, same `useMemo`, same dialogs, same state, same hidden file input.

## Logic preserved (untouched)
- useStore hooks: `products`, `addProduct`, `updateProduct`, `deleteProduct`, `findProductBySku`, `registrarEntrada`, `entradas`, `deleteEntrada`, `exportInventarioExcel`
- State: `query`, `dialogOpen`, `editing`, `form`, `dupError`, `entradaOpen`, `entradaText`, `entradaMsg`, `importOpen`, `importingInv`, `importPreview`, `importResult`, `importFileRef`
- Memo: `filtered`, `totalUnidades`, `entradaPreview`, `validCount`, `invalidCount`
- Handlers: `openCreate`, `openEdit`, `handleSave`, `handleEntrada`, `handleImportInventario`, `confirmImport`
- All 3 dialogs: add/edit, entrada rápida, importar Excel
- Live preview parsing of `SKU*cantidad` lines

## Visual changes
1. **Header**: cleaner title hierarchy (`text-2xl font-semibold tracking-tight`), subtitle in muted-foreground, action buttons on the right with consistent `h-9 rounded-md text-[13px] font-medium`.
2. **Buttons**: outline buttons use `border-border bg-background hover:bg-muted` (subtle bg change on hover). Primary action ("Añadir", "Guardar", "Registrar entrada", "Confirmar importación") uses `bg-foreground text-background hover:bg-foreground/90` (dark on light, light on dark — NOT `bg-primary`).
3. **Search input**: `h-9 rounded-md border-border bg-background`, search icon with `strokeWidth={1.5}`.
4. **Table**: `divide-y divide-border` for hairline rows (no heavy borders), header is `text-[11px] uppercase tracking-wider text-muted-foreground`, body text is `text-[13px]`, hover is `hover:bg-muted/50`.
5. **Low-stock indicator**: replaced the big `rounded-full` colored badge + `AlertTriangle` icon with a **small `h-1.5 w-1.5 rounded-full bg-destructive` red dot** inline before the stock number.
6. **Stock number**: now plain `tabular-nums text-foreground` (no badge).
7. **Row actions** (Pencil/Trash2): appear on `group-hover`, `strokeWidth={1.5}`, `text-muted-foreground` → `hover:text-foreground` (or `hover:text-destructive` for delete), `hover:bg-muted` (subtle).
8. **Entradas recientes**: removed the green `+cantidad` badge and amber `NO CAT.` badge. Replaced with: plain `+cantidad` in foreground, "no en catálogo" with a small `1px` muted dot. Uses `divide-y divide-border` instead of bordered cards.
9. **Dialogs**: shadcn Dialog kept, but content uses `p-0` and internal sections divided by `border-b border-border` for cleaner whitespace. Headers, body and footer separated by hairline borders. No `rounded-2xl` — uses `rounded-lg`.
10. **Live preview (entrada)**: removed green/red backgrounds, replaced with `border-border bg-muted/40` for valid, `border-destructive/30 bg-destructive/5` for invalid. Icons use `strokeWidth={1.5}`.
11. **Import preview**: removed the rounded `bg-muted` "Actualizar/Nuevo" badges — replaced with a small dot (`h-1.5 w-1.5 rounded-full`) + plain text label. Summary uses 3-column metric layout (Total / A actualizar / Nuevos) instead of `rounded-full bg-muted` pills.
12. **Icons**: defined `const ICON_PROPS = { strokeWidth: 1.5 }` and applied to all lucide-react icons. Removed unused `AlertTriangle` and `FileUp` imports; added `AlertCircle`.
13. **Animations**: outer wrapper uses `anim-fade-in`, header and table/cards use `anim-slide-up` (subtle, existing classes).
14. **No gradients / no aurora / no neon**: only neutral `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, plus `bg-destructive` for the tiny status dot.
15. **No `bg-primary`** anywhere in the JSX (matches the "primary action = bg-foreground" rule).

## Verification
- `bun run lint` → 0 errors, 0 warnings.
