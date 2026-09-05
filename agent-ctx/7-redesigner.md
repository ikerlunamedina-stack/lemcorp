# Task 7 — Redesign ia-view (Alana chat) minimalist

## What I did
- Read `/home/z/my-project/src/components/lem/ia-view.tsx` completely (673 lines).
- Reviewed sibling work record `/home/z/my-project/agent-ctx/6-a-redesigner.md` to align with the established minimalist design language.
- Inspected `globals.css` (CSS vars + `anim-fade-in`, `scroll-thin`, `press` utilities) and `alana-avatar.tsx` (accepts `className` + `glow` prop).
- Rewrote the JSX return block only. **All logic preserved verbatim.**
- Removed unused imports (`Zap`, `Check`, `XIcon`) that became dangling after the visual cleanup.
- Added `const ICON_PROPS = { strokeWidth: 1.5 } as const` and spread it on every lucide-react icon (line-art per design language).
- `bun run lint` → exit 0, no errors.

## Logic preserved (untouched)
- useStore hooks: `products`, `equipos`, `miembros`, `despachos`, `empresa`, `settings.usuario`, `settings.voz`, `memoriaIA`, `addRecordatorio`, `addNotificacion`, `addMemoria`, `addProduct`, `updateProduct`, `findProductBySku`, `addEquipment`, `registrarDespacho`, `addNota`, `addMiembro`, `setSetting`
- Interfaces: `ChatMsg`, `AccionEjecutada`
- Constants/data: `SUGERENCIAS` array (unchanged), `STORAGE_KEY`, `CINCO_HORAS`
- Helpers: `loadChat`, `saveChat`, `timeAgo`
- State: `messages`, `input`, `loading`, `showHistory`, `speakingId`, `scrollRef`
- Effects: load chat (welcome msg fallback), save chat, auto-scroll, TTS voice load
- Handlers: `hablar` (TTS toggle), `enviar` (fetch /api/ia + recordatorio/memoria/acciones processing + auto-speak), `limpiarHistorial`
- UI features: suggestions chips (first 6), history panel overlay, TTS per-message button, action result dots, loading "Pensando…" indicator

## Visual changes
1. **Header**: `border-b border-border` hairline. Title is plain `text-foreground font-semibold`. The big colored `ACTIVO` badge → a small `h-1.5 w-1.5` pinging emerald dot. The colored `VOZ` pill → a small muted `Volume2` icon (line-art, strokeWidth 1.5). Action buttons are `h-8 rounded-md border-border bg-background hover:bg-muted`. The header avatar keeps `glow` OFF and gains `ring-1 ring-border`.
2. **Messages**: bubbles are `rounded-2xl px-3.5 py-2.5` with no tails/arrows, no per-bubble border, no shadow. User = `bg-foreground text-background` (right-aligned), assistant = `bg-muted text-foreground` (left-aligned). Message avatar = 28px circle with `ring-1 ring-border` (no glow). User avatar = `h-7 w-7 rounded-full border border-border bg-background` with line-art `User` icon.
3. **TTS button**: small inline icon inside the bubble (`h-5 w-5`), no border/background, color follows bubble text with `/70` opacity, full color when speaking.
4. **Recordatorio**: thin inline line — `BellRing` icon (strokeWidth 1.5) + "Recordatorio" label + `·` separator + value + `·` + date. No colored badge.
5. **Aprendido**: same inline pattern — `Brain` icon + "Aprendido" label + `·` + value. No emerald badge.
6. **Acciones ejecutadas**: hairline list. Header is small uppercase muted text with `ClipboardList` icon. Each row = line-art icon (`PackagePlus`/`Package`/`Cpu`/`Send`/`FileText`/`Users`/`Sun`) in muted-foreground, foreground description, and a tiny status dot — `bg-emerald-500` for ok, `bg-destructive` for error. Replaces the old big colored `rounded-full` check/x circles and colored `border-primary/30 bg-primary/5` rows.
7. **Loading indicator**: `Pensando…` bubble uses `bg-muted` (no border, no shadow) with three `h-1.5 w-1.5` muted-foreground/60 bouncing dots.
8. **History panel**: `border-l border-border bg-background/95 backdrop-blur-sm` overlay. Header has a hairline `border-b`, list items are `rounded-md hover:bg-muted` (no per-item border). Close button is line-art `Trash2` in muted-foreground.
9. **Suggestions**: `rounded-full border border-border bg-background` chips, `hover:bg-muted hover:text-foreground`, icons in `text-muted-foreground` (the old per-suggestion accent colors are no longer applied — uniform muted-foreground line-art).
10. **Input bar**: wrapper has only `border-t border-border` (no side/bottom border). Textarea is borderless with `bg-muted`, `focus-visible:ring-2 focus-visible:ring-foreground/10`. Send button is `bg-foreground text-background hover:bg-foreground/90` (replaces the colored `btn-spacecom`). Safe-area bottom padding preserved.
11. **Icons**: all lucide-react icons use `strokeWidth={1.5}` via the shared `ICON_PROPS` constant.
12. **No gradients / no neon / no aurora / no flashy shadows**: only `bg-background`, `bg-muted`, `bg-foreground`, `text-foreground`, `text-muted-foreground`, `border-border`, plus `bg-emerald-500` / `bg-destructive` for the tiny status dots.

## Verification
- `bun run lint` → exit code 0, no errors, no warnings.
