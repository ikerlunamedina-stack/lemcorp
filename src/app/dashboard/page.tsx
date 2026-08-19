import { AppLayout } from "@/components/lem/app-layout";
import { DashboardView } from "@/components/lem/dashboard-view";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <DashboardView />
      </div>
    </AppLayout>
  );
}
