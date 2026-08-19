import { AppLayout } from "@/components/lem/app-layout";
import { EquiposView } from "@/components/lem/equipos-view";

export default function EquiposPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <EquiposView />
      </div>
    </AppLayout>
  );
}
