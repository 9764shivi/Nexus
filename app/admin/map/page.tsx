"use client";

import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Users, AlertCircle, CheckCircle2 } from "lucide-react";

const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function AdminMapPage() {
  const [showIncidents, setShowIncidents] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const assignReport = useMutation(api.reports.assignReport);

  const handleAssign = async (reportId: string, volunteerId: string) => {
    try {
      await assignReport({ reportId: reportId as any, volunteerId: volunteerId as any });
      toast.success("Personnel dispatched successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to dispatch personnel");
    }
  };
  
  const rawReports = useQuery(api.reports.getReports, {});
  const reports = rawReports ? (Array.isArray(rawReports) ? rawReports : (rawReports as any).page) : undefined;
  const volunteerLocs = useQuery(api.locations.getVolunteerLocations);

  const selectedReport = reports?.find((r: any) => r._id === selectedReportId);

  const reportMarkers = showIncidents ? (reports?.filter((r: any) => 
    r.status === "open"
  ).map((r: any) => ({
    id: r._id,
    position: [r.location.lat, r.location.lng] as [number, number],
    title: r.title,
    type: "report" as const,
    urgency: r.urgency,
  })) || []) : [];

  const volunteerMarkers = showPersonnel ? ((volunteerLocs as any[])?.map((v: any) => ({
    id: v._id,
    position: [v.lat, v.lng] as [number, number],
    title: `${v.name} (${v.address})`,
    name: v.name,
    userId: v.userId,
    type: "volunteer" as const,
    assignedReportsCount: v.assignedReportsCount,
  })) || []) : [];

  const allMarkers = [...reportMarkers, ...volunteerMarkers];

  return (
    <div className="h-full min-h-[calc(100vh-80px)] flex flex-col gap-4 sm:gap-6 w-full mx-auto overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight italic uppercase leading-none">Geospatial Intelligence</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium italic mt-1">Live tracking of incidents and rescue personnel.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button 
            onClick={() => setShowIncidents(!showIncidents)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-lg border transition-all active:scale-95 ${
              showIncidents ? "bg-red-500 text-white border-red-400" : "bg-card text-muted-foreground border-border"
            }`}
          >
            <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${showIncidents ? "animate-pulse" : ""}`} />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Incidents</span>
          </button>
          
          <button 
            onClick={() => setShowPersonnel(!showPersonnel)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-lg border transition-all active:scale-95 ${
              showPersonnel ? "bg-emerald-600 text-white border-emerald-400" : "bg-card text-muted-foreground border-border"
            }`}
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Personnel</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 min-h-0">
        <Card className="lg:col-span-3 border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm min-h-[400px]">
          <CardContent className="p-0 h-full">
            <Map 
              zoom={selectedReport ? 12 : 4} 
              markers={allMarkers} 
              center={selectedReport ? [selectedReport.location.lat, selectedReport.location.lng] : [23, 78]}
              onAssign={handleAssign}
            />
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="bg-muted/50/50 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Active Hotspots
            </CardTitle>
            <CardDescription className="font-medium">Highest priority coordination points.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {reports?.filter((r: any) => 
              r.status === "open"
            )
            .sort((a: any, b: any) => (b.urgency === 'high' ? 1 : -1)) // Sort high urgency to top
            .map((report: any) => (
              <div 
                key={report._id} 
                onClick={() => setSelectedReportId(report._id === selectedReportId ? null : report._id)}
                className={`p-4 rounded-xl transition-all cursor-pointer group border-2 ${
                  selectedReportId === report._id 
                    ? "bg-indigo-50 border-indigo-200 shadow-md ring-4 ring-indigo-50/50" 
                    : "bg-muted/50 border-transparent hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    report.urgency === 'high' ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-500"
                  }`}>
                    {report.urgency}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">{new Date(report._creationTime).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-foreground transition-colors uppercase italic tracking-tighter">{report.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed italic">{report.description}</p>
                
                {selectedReportId === report._id && volunteerLocs && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 space-y-2">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nearby Rescuers</p>
                    {(volunteerLocs as any[])
                      ?.filter((v: any) => v.assignedReportsCount < 2) // Hide busy personnel
                      .map((v: any) => ({
                        ...v,
                        distance: Math.sqrt(
                          Math.pow(v.lat - report.location.lat, 2) + 
                          Math.pow(v.lng - report.location.lng, 2)
                        ) * 111 // rough degree to km
                      }))
                      .sort((a, b) => a.distance - b.distance)
                      .slice(0, 3)
                      .map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-card p-2 rounded-lg border border-indigo-50">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-600 uppercase italic tracking-tighter leading-none">{v.name}</span>
                             <span className="text-[9px] font-black text-indigo-600 mt-1 uppercase italic">
                               {v.distance.toFixed(1)} KM
                             </span>
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               if (v.assignedReportsCount >= 2) return;
                               handleAssign(report._id, v.userId);
                             }}
                             disabled={v.assignedReportsCount >= 2}
                             className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg shadow-sm transition-all ${
                               v.assignedReportsCount >= 2 
                                 ? "bg-amber-100 text-amber-600 cursor-not-allowed border border-amber-200" 
                                 : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-indigo-100"
                             }`}
                           >
                             {v.assignedReportsCount >= 2 ? "Busy" : "Assign"}
                           </button>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
            
            {reports?.filter((r: any) => 
              r.urgency === 'high' && 
              r.status === "open" && 
              r.verificationStatus !== "rejected"
            ).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 opacity-20" />
                <p className="text-muted-foreground font-medium text-sm">All urgent situations are currently under control.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

