"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  FileText, 
  Users, 
  Settings, 
  PlusSquare, 
  History, 
  CheckCircle2, 
  UserCircle 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();

  const routes = {
    super_admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Global Map", href: "/admin/map", icon: MapIcon },
      { name: "Reports", href: "/admin/reports", icon: FileText },
      { name: "Volunteers", href: "/admin/volunteers", icon: Users },
      { name: "Categories", href: "/admin/categories", icon: Settings },
    ],
    field_worker: [
      { name: "Dashboard", href: "/worker/dashboard", icon: LayoutDashboard },
      { name: "New Report", href: "/worker/intake", icon: PlusSquare },
      { name: "History", href: "/worker/history", icon: History },
    ],
    volunteer: [
      { name: "Dashboard", href: "/volunteer/dashboard", icon: LayoutDashboard },
      { name: "My Tasks", href: "/volunteer/tasks", icon: CheckCircle2 },
      { name: "Profile", href: "/volunteer/profile", icon: UserCircle },
    ],
  };

  const activeRoutes = role ? routes[role] : [];

  return (
    <div className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col pt-6 shadow-sm">
      <div className="px-6 mb-8">
        <h2 className="text-2xl font-black text-indigo-600 tracking-tighter uppercase italic">Nexus</h2>
        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Social Impact Platform</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {activeRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group",
              pathname.includes(route.href)
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <route.icon className={cn(
              "w-5 h-5 transition-colors",
              pathname.includes(route.href) ? "text-indigo-600" : "text-muted-foreground group-hover:text-slate-600"
            )} />
            {route.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border mb-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-muted-foreground rounded-xl hover:bg-muted/50 hover:text-foreground transition-all"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </div>
  );
}

