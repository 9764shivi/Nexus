"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Info, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";

export function TopNav() {
  const { role } = useRole();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Update URL when search changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      const currentQ = params.get("q") || "";
      
      if (search === currentQ) return; // Prevent redundant replaces

      if (search) {
        params.set("q", search);
      } else {
        params.delete("q");
      }
      
      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, router, pathname, searchParams]);

  const roleLabels = {
    super_admin: "Super Admin",
    field_worker: "Field Worker",
    volunteer: "Volunteer",
  };

  const notifications = useQuery(api.reports.getNotifications, {}) || [];
  const markAsRead = useMutation(api.reports.markNotificationRead);
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.currentUser);
  const updateUserProfile = useMutation(api.users.updateUserProfile);

  useEffect(() => {
    if (!clerkUser?.imageUrl || !convexUser) return;
    
    // Check if the identity image in Clerk differs from our database
    if (clerkUser.imageUrl !== convexUser.imageUrl) {
      // Avoid hammering the DB if we already synced this specific URL this session
      const storedKey = sessionStorage.getItem("last_synced_clerk_image");
      if (storedKey !== clerkUser.imageUrl) {
        sessionStorage.setItem("last_synced_clerk_image", clerkUser.imageUrl);
        updateUserProfile({ imageUrl: clerkUser.imageUrl }).catch(console.error);
      }
    }
  }, [clerkUser?.imageUrl, convexUser?.imageUrl, updateUserProfile]);

  return (
    <div className="h-16 border-b bg-background/80 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports or volunteers..." 
            className="pl-10 bg-muted/50 border-none focus-visible:ring-1 ring-indigo-200 h-10 rounded-xl font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2.5 text-muted-foreground hover:text-slate-600 hover:bg-muted rounded-xl transition-all active:scale-95 group">
              <Bell className={unreadCount > 0 ? "w-5 h-5 text-indigo-600 animate-pulse" : "w-5 h-5"} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-2xl border-none shadow-2xl mr-4">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Notifications</h3>
              <Badge className="bg-indigo-50 text-indigo-600 border-none">{unreadCount} New</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n: any) => (
                <div 
                  key={n._id} 
                  className={`p-4 border-b border-slate-50 flex gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${!n.isRead ? "bg-indigo-50/30" : ""}`}
                  onClick={() => markAsRead({ id: n._id })}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === "new_report" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                       <p className="text-xs font-black text-foreground uppercase italic leading-none">{n.title}</p>
                       {!n.isRead && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium italic">{n.message}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-12 text-center text-slate-300 italic font-medium">No alerts detected.</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <ModeToggle />
        
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            {role && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border-none">
                {roleLabels[role]}
              </Badge>
            )}
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-9 w-9 border-2 border-indigo-100 shadow-sm",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

