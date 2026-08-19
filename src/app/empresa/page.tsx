import { AppLayout } from "@/components/lem/app-layout";
import { EmpresaView } from "@/components/lem/empresa-view";

export default function EmpresaPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <EmpresaView />
      </div>
    </AppLayout>
  );
}
