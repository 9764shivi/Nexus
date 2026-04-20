"use client";

import { useQuery } from "convex/react";
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
  
  const rawReports = useQuery(api.reports.getReports, {});
  const reports = rawReports ? (Array.isArray(rawReports) ? rawReports : (rawReports as any).page) : undefined;
  const volunteerLocs = useQuery(api.locations.getVolunteerLocations);

  const selectedReport = reports?.find((r: any) => r._id === selectedReportId);

  const reportMarkers = showIncidents ? (reports?.filter((r: any) => r.status !== "resolved").map((r: any) => ({
    id: r._id,
    position: [r.location.lat, r.location.lng] as [number, number],
    title: r.title,
    type: "report" as const,
    urgency: r.urgency,
  })) || []) : [];

  const volunteerMarkers = showPersonnel ? (volunteerLocs?.map((v: any) => ({
    id: v._id,
    position: [v.lat, v.lng] as [number, number],
    title: `${v.name} (${v.address})`,
    name: v.name,
    type: "volunteer" as const,
  })) || []) : [];

  const allMarkers = [...reportMarkers, ...volunteerMarkers];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight italic uppercase">Geospatial Intelligence</h1>
          <p className="text-muted-foreground font-medium italic">Live tracking of incidents and rescue personnel.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowIncidents(!showIncidents)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg border transition-all active:scale-95 ${
              showIncidents ? "bg-red-500 text-white border-red-400" : "bg-card text-muted-foreground border-border"
            }`}
          >
            <AlertCircle className={`w-4 h-4 ${showIncidents ? "animate-pulse" : ""}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">Emergency Incidents</span>
          </button>
          
          <button 
            onClick={() => setShowPersonnel(!showPersonnel)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg border transition-all active:scale-95 ${
              showPersonnel ? "bg-indigo-600 text-white border-indigo-400" : "bg-card text-muted-foreground border-border"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Active Personnel</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0">
        <Card className="xl:col-span-3 border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0 h-full">
            <Map 
              zoom={selectedReport ? 12 : 4} 
              markers={allMarkers} 
              center={selectedReport ? [selectedReport.location.lat, selectedReport.location.lng] : [23, 78]}
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
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {reports?.filter((r: any) => r.urgency === 'high' || r._id === selectedReportId).map((report: any) => (
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
                    {volunteerLocs
                      .map(v => ({
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
                           <span className="text-[10px] font-bold text-slate-600 uppercase italic tracking-tighter">{v.name}</span>
                           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase italic">
                             {v.distance.toFixed(1)} KM
                           </span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
            
            {reports?.filter((r: any) => r.urgency === 'high').length === 0 && (
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

