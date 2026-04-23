import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "open" | "assigned" | "pending" | "rejected" | "resolved";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    open: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    assigned: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    rejected: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    resolved: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  };

  return (
    <Badge variant="outline" className={cn("capitalize px-2 py-1", styles[status])}>
      {status}
    </Badge>
  );
}

