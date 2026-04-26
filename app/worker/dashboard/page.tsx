"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusSquare, History, MapPin, AlertCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

function WorkerDashboardContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  const reportsData = useQuery(api.reports.getReports, {});
  const user = useQuery(api.users.currentUser);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err)
    );
  }, []);

  const reports = Array.isArray(reportsData) ? reportsData : (reportsData as any)?.page || [];
  
  const myReports = reports.filter((r: any) => r.workerId === user?._id);
  const todayCount = myReports.filter((r: any) => 
    new Date(r._creationTime).toDateString() === new Date().toDateString()
  ).length;

  const filteredReports = searchQuery
    ? myReports.filter((r: any) =>
        r.title?.toLowerCase().includes(searchQuery) ||
        r.location?.address?.toLowerCase().includes(searchQuery) ||
        r.description?.toLowerCase().includes(searchQuery)
      )
    : myReports;

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground tracking-tight leading-none italic uppercase">Field Hub</h1>
        <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest bg-muted inline-block px-4 py-1.5 rounded-full border border-border">System Ready • GPS Active</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Link href="/worker/intake" className="w-full">
          <Button size="lg" className="w-full h-32 text-xl font-black flex flex-col gap-3 rounded-3xl shadow-2xl hover:scale-[1.02] transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-95 border-b-8 border-indigo-900">
            <PlusSquare className="w-10 h-10" />
            NEW SURVEY ENTRY
          </Button>
        </Link>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-2xl border-none shadow-xl bg-card flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:bg-accent transition-all hover:ring-2 hover:ring-indigo-500/50">
            <p className="text-4xl font-black text-indigo-600 tracking-tighter mb-1">{todayCount}</p>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Daily Surveys</span>
          </Card>
          <Link href="/worker/history">
            <Card className="rounded-2xl border-none shadow-xl bg-card h-full flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:bg-accent transition-all hover:ring-2 hover:ring-indigo-500/50">
              <History className="w-8 h-8 text-indigo-400 mb-2 group-hover:text-indigo-600 transition-colors" />
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">History</span>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-black text-foreground uppercase tracking-tighter italic px-2">Nearby Activity (5km)</h2>
        <div className="h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
           <Map 
             center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [19.0760, 72.8777]}
             zoom={13}
             markers={reports.filter((r: any) => r.status !== 'resolved' && r.verificationStatus !== 'rejected').map((r: any) => ({
               id: r._id,
               position: [r.location.lat, r.location.lng],
               title: r.title,
               type: "report"
             }))}
           />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-base font-black text-foreground uppercase tracking-tighter italic">Recent Submissions</h2>
          <Link href="/worker/history">
            <Button variant="link" className="text-xs font-bold text-indigo-600 uppercase">View All</Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          {searchQuery && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
              {filteredReports.length} result{filteredReports.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {filteredReports.slice(0, searchQuery ? filteredReports.length : 3).map((report: any) => (
            <div key={report._id} className={`p-5 rounded-xl bg-card shadow-xl border border-border flex items-center justify-between group transition-all hover:ring-2 ${
              report.status === 'resolved' ? 'hover:ring-emerald-500/50 hover:border-emerald-500/50' : 'hover:ring-indigo-500/50 hover:border-indigo-500/50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                  report.urgency === 'high' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                }`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground leading-tight">{report.title}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {new Date(report._creationTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <StatusBadge status={report.status} />
            </div>
          ))}
          {filteredReports.length === 0 && (
            <p className="p-8 text-center text-muted-foreground font-medium italic">
              {searchQuery ? `No reports matching "${searchQuery}".` : "No reports filed today."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkerDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-muted-foreground animate-pulse">Loading...</div>}>
      <WorkerDashboardContent />
    </Suspense>
  );
}

