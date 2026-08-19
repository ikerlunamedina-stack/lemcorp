export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[18px] font-bold text-primary">L</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[13px] font-semibold text-foreground">LEMCORP</span>
          <span className="text-[11px] text-muted-foreground">Cargando…</span>
        </div>
      </div>
    </div>
  );
}
