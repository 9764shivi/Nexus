"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Users, FileText, CheckCircle2, TrendingUp, AlertTriangle, Eye, Activity, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ReportDetailDialog } from "@/components/report-detail-dialog";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  
  const stats = useQuery(api.reports.getStats, {});
  const reports = useQuery(api.reports.getReports, { search: searchQuery });
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (!stats || !reports) return (
    <div className="h-[80vh] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-indigo-600 animate-pulse" />
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Initializing Command Center...</p>
       </div>
    </div>
  );

  const reportsArray = Array.isArray(reports) ? reports : (reports as any)?.page || [];

  const summaryCards = [
    { title: "Total Reports", value: stats.total, icon: FileText, color: "text-blue-600" },
    { title: "Active Issues", value: stats.active, icon: AlertTriangle, color: "text-amber-600" },
    { title: "Resolved Cases", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-600" },
    { title: "Active Personnel", value: stats.totalVolunteers || 0, icon: Users, color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight italic uppercase">Command Center</h1>
        <p className="text-muted-foreground font-medium italic">Real-time overview of humanitarian efforts and personnel logistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/reports?tab=all" className="block transition-transform active:scale-95">
          <Card className="hover:shadow-lg transition-all border-none shadow-xl bg-card overflow-hidden group rounded-3xl hover:ring-2 hover:ring-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-8">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Total Reports</CardTitle>
              <div className="p-3 rounded-2xl bg-muted/50 group-hover:bg-blue-50 transition-all">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-foreground tracking-tighter italic">{stats.total}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/reports?tab=active" className="block transition-transform active:scale-95">
          <Card className="hover:shadow-lg transition-all border-none shadow-xl bg-card overflow-hidden group rounded-3xl hover:ring-2 hover:ring-amber-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-8">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Active Issues</CardTitle>
              <div className="p-3 rounded-2xl bg-muted/50 group-hover:bg-amber-50 transition-all">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-foreground tracking-tighter italic">{stats.active}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/reports?tab=resolved" className="block transition-transform active:scale-95">
          <Card className="hover:shadow-lg transition-all border-none shadow-xl bg-card overflow-hidden group rounded-3xl hover:ring-2 hover:ring-emerald-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-8">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Resolved Cases</CardTitle>
              <div className="p-3 rounded-2xl bg-muted/50 group-hover:bg-emerald-50 transition-all">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-foreground tracking-tighter italic">{stats.resolved}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/volunteers" className="block transition-transform active:scale-95">
          <Card className="hover:shadow-lg transition-all border-none shadow-xl bg-card overflow-hidden group rounded-3xl hover:ring-2 hover:ring-indigo-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-8">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Active Personnel</CardTitle>
              <div className="p-3 rounded-2xl bg-muted/50 group-hover:bg-indigo-50 transition-all">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-foreground tracking-tighter italic">{stats.totalVolunteers || 0}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl bg-card rounded-3xl p-4">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-lg font-black italic uppercase italic">
              <Activity className="w-5 h-5 text-indigo-600" />
              Urgency Matrix
            </CardTitle>
            <CardDescription className="italic font-medium text-muted-foreground">Active reports by urgency level.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.urgencyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} fontWeight="black" />
                <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} fontWeight="black" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60}>
                  {stats.urgencyData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.name === "High" ? "#ef4444" : entry.name === "Medium" ? "#f59e0b" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card rounded-3xl flex flex-col overflow-hidden">
          <CardHeader className="p-10 border-b border-slate-50">
            <CardTitle className="flex items-center gap-2 text-lg font-black italic uppercase">
              <FileText className="w-5 h-5 text-indigo-600" />
              Situational Live Feed
            </CardTitle>
            <CardDescription className="italic font-medium text-muted-foreground">Immediate stream of incoming mission data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px]">
            <div className="divide-y divide-slate-50">
              {reportsArray.filter((r: any) => r.verificationStatus !== 'rejected').slice(0, 10).map((report: any) => (
                <div key={report._id} className="flex items-center gap-6 p-8 hover:bg-muted/50/80 transition-all group">
                  <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                    report.urgency === 'high' ? 'bg-red-50 text-red-500' : 
                    report.urgency === 'medium' ? 'bg-amber-50 text-amber-500' : 
                    'bg-blue-50 text-blue-500'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <p className="font-black text-foreground text-lg line-clamp-1 italic uppercase tracking-tighter leading-none">{report.title || "Unknown Incident"}</p>
                       <StatusBadge status={report.status} />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground line-clamp-1 italic">{report.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(report._creationTime).toLocaleTimeString()}</p>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-lg border border-slate-100">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold text-slate-400 italic truncate max-w-[150px]">{report.location.address}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-border hover:bg-indigo-600 hover:text-white transition-all shadow-sm font-black text-[10px] tracking-widest uppercase gap-2"
                    onClick={() => setSelectedReportId(report._id)}
                  >
                    <Eye className="w-4 h-4" />
                    View Report
                  </Button>
                </div>
              ))}
              {reportsArray.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic font-medium">No live reports active.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ReportDetailDialog 
        reportId={selectedReportId} 
        isOpen={!!selectedReportId} 
        onOpenChange={(open) => !open && setSelectedReportId(null)} 
      />
    </div>
  );
}

