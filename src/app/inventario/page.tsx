import { AppLayout } from "@/components/lem/app-layout";
import { InventarioView } from "@/components/lem/inventario-sistema-view";

export default function InventarioPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <InventarioView />
      </div>
    </AppLayout>
  );
}
