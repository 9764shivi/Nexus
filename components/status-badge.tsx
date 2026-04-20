import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "open" | "assigned" | "resolved";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    open: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    assigned: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    resolved: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  };

  return (
    <Badge variant="outline" className={cn("capitalize px-2 py-1", styles[status])}>
      {status}
    </Badge>
  );
}

