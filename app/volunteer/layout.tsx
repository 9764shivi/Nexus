import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import { Suspense } from "react";

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<div className="h-16 border-b bg-background/80 shadow-sm backdrop-blur-md" />}>
          <TopNav />
        </Suspense>
        <main className="p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

