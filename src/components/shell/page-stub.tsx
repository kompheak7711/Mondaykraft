import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder for a screen that is on the build list but not built yet. */
export function PageStub({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <EmptyState icon={Construction} title={`${title} is not built yet`} description={description ?? `Screen ${id} is next on the build list.`} />
    </div>
  );
}
