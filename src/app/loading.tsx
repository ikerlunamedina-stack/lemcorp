export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-xl bg-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z" />
              <path d="M12 2 L12 9" />
              <path d="M22 8.5 L12 9 L2 8.5" />
              <path d="M12 9 L12 22" />
              <path d="M12 9 L17 12 L22 8.5" />
              <path d="M12 9 L7 12 L2 8.5" />
              <path d="M17 12 L17 18 L12 22" />
              <path d="M7 12 L7 18 L12 22" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-xl border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[15px] font-bold text-foreground">Nuclon</span>
          <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">WMS · Almacén</span>
        </div>
      </div>
    </div>
  );
}
