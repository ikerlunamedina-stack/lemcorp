export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-16 w-16 rounded-xl object-contain" />
          <div className="absolute -inset-1 rounded-xl border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[15px] font-bold text-foreground">LEMCORP</span>
          <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">WMS · Almacén</span>
        </div>
      </div>
    </div>
  );
}
