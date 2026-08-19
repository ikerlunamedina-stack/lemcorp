import { AppLayout } from "@/components/lem/app-layout";
import { SeriesView } from "@/components/lem/series-view";

export default function SeriesPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <SeriesView />
      </div>
    </AppLayout>
  );
}
