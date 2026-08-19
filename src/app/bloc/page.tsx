import { AppLayout } from "@/components/lem/app-layout";
import { BlocView } from "@/components/lem/bloc-view";

export default function BlocPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scroll-thin">
        <BlocView />
      </div>
    </AppLayout>
  );
}
