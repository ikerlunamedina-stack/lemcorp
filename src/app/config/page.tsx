import { AppLayout } from "@/components/lem/app-layout";
import { ConfigView } from "@/components/lem/config-view";

export default function ConfigPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <ConfigView />
      </div>
    </AppLayout>
  );
}
