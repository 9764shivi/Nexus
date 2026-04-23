"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ReportDetailDialog } from "@/components/report-detail-dialog";
import { 
  MapPin, 
  Trash2, 
  UserPlus, 
  Download,
  Eye,
  XCircle,
  CheckCircle2,
  User,
  FileText,
  Image as ImageIcon,
  X,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  History as HistoryIcon,
  Users
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function AdminReportsPage() {
  return (
    <Suspense fallback={
      <div className="h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FileText className="w-12 h-12 text-indigo-600 animate-pulse" />
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Accessing Deployment Ledger...</p>
        </div>
      </div>
    }>
      <ReportsLedgerContent />
    </Suspense>
  );
}

function ReportsLedgerContent() {
  const reportsData = useQuery(api.reports.getReports, {});
  const allReports = Array.isArray(reportsData) ? reportsData : (reportsData as any)?.page || [];

  // Split into active (non-rejected) and rejected
  const activeReports = allReports.filter((r: any) => r.status === "open" || r.status === "assigned");
  const rejectedReports = allReports.filter((r: any) => r.verificationStatus === "rejected");

  const assignReport = useMutation(api.reports.assignReport);
  const deleteReport = useMutation(api.reports.deleteReport);
  const updateVerification = useMutation(api.reports.updateVerification);
  const verifyResolution = useMutation(api.reports.verifyResolution);
  const provideHelp = useMutation(api.reports.provideHelp);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as "all" | "active" | "rejected" | "resolved" | null;

  const [activeTab, setActiveTab] = useState<"all" | "active" | "rejected" | "resolved">(tabParam || "all");

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam && (tabParam === "all" || tabParam === "active" || tabParam === "rejected" || tabParam === "resolved")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewReportDialog, setViewReportDialog] = useState<any>(null);
  const [profileReport, setProfileReport] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const nearestVolunteers = useQuery(
    api.volunteers.getNearestVolunteers, 
    selectedReport ? { lat: selectedReport.location.lat, lng: selectedReport.location.lng } : "skip"
  );

  const handleVerify = async (reportId: any, status: "accepted" | "rejected") => {
    try {
      await updateVerification({ reportId, status });
      toast.success(`Report ${status}`);
    } catch(e) {
      toast.error("Failed to update verification status");
    }
  };


  const handleAssign = async (volunteerId: any) => {
    if (!selectedReport) return;
    setIsAssigning(true);
    try {
      await assignReport({ reportId: selectedReport._id, volunteerId });
      toast.success("Task assigned successfully");
    } catch (e) {
      toast.error("Assignment failed");
    } finally {
      setIsAssigning(false);
      setSelectedReport(null);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Are you sure you want to remove this record?")) return;
    try {
      await deleteReport({ id });
      toast.success("Record expunged");
    } catch (e) {
      toast.error("Deletion failed");
    }
  };

  const handleExport = () => {
    if (!allReports || allReports.length === 0) return;
    const headers = ["Title", "Status", "Urgency", "Category", "Location", "Date", "Verification"];
    const rows = allReports.map((r: any) => [
      r.title,
      r.status,
      r.urgency,
      r.category || "General",
      r.location.address.replace(/,/g, " "),
      new Date(r._creationTime).toLocaleString(),
      r.verificationStatus || "pending"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `nexus_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resolvedReports = allReports.filter((r: any) => r.status === "resolved" || r.status === "pending" || r.status === "rejected");
  const pendingResolutionCount = resolvedReports.filter((r: any) => r.resolutionVerificationStatus === "pending").length;
  const displayReports = 
    activeTab === "all" ? allReports :
    activeTab === "active" ? activeReports : 
    activeTab === "rejected" ? rejectedReports : 
    resolvedReports;


  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight italic uppercase">Deployment Ledger</h1>
          <p className="text-muted-foreground font-medium tracking-tight italic">Manage and assign humanitarian responses based on geographical proximity.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="rounded-2xl border-2 border-border font-black gap-2 hover:bg-muted/50 active:scale-95 transition-all text-xs tracking-widest uppercase h-12">
           <Download className="w-4 h-4 text-indigo-500" />
           Export Ledger
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-muted rounded-2xl w-fit">
        <button
          onClick={() => {
            setActiveTab("all");
            router.push("/admin/reports?tab=all");
          }}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "all"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-slate-600"
          }`}
        >
          All Records
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === "all" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-muted-foreground"}`}>
            {allReports.length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("active");
            router.push("/admin/reports?tab=active");
          }}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "active"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-slate-600"
          }`}
        >
          Active Reports
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === "active" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-muted-foreground"}`}>
            {activeReports.length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("rejected");
            router.push("/admin/reports?tab=rejected");
          }}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "rejected"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-slate-600"
          }`}
        >
          Rejected Reports
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === "rejected" ? "bg-red-100 text-red-600" : "bg-slate-200 text-muted-foreground"}`}>
            {rejectedReports.length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("resolved");
            router.push("/admin/reports?tab=resolved");
          }}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === "resolved"
              ? "bg-card text-foreground shadow-md"
              : "text-muted-foreground hover:text-slate-600"
          }`}
        >
          Resolutions
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === "resolved" ? (pendingResolutionCount > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600") : "bg-slate-200 text-muted-foreground"}`}>
            {resolvedReports.length}{pendingResolutionCount > 0 ? ` · ${pendingResolutionCount} pending` : ""}
          </span>
        </button>
      </div>

      <Card className="border-none shadow-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] font-black uppercase text-[11px] tracking-widest text-muted-foreground">Incident Details</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Assigned To</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Urgency</TableHead>
              <TableHead className="text-right font-black uppercase text-[11px] tracking-widest text-muted-foreground">Coordination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayReports?.map((report: any) => (
              <TableRow key={report._id} className={`group hover:bg-muted/50/50 transition-colors ${activeTab === "rejected" ? "opacity-80" : ""}`}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-base">{report.title}</span>
                      {activeTab === "rejected" && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">Rejected</span>
                      )}
                      {report.helpStatus === "requested" && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">Help Requested</span>
                      )}
                      {report.helpStatus === "provided" && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">Help Sent</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-muted/50 w-fit rounded-lg border border-slate-100">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] text-slate-600 font-bold italic truncate max-w-[200px]">
                        {report.location.address || "Coordinates recorded"}
                      </span>
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground mt-1 flex items-center gap-1 uppercase tracking-tight">
                      <Clock className="w-2.5 h-2.5" /> Logged: {formatDate(report._creationTime)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={(report.status === "resolved" && report.resolutionVerificationStatus === "pending") ? "pending" : report.status} />
                </TableCell>
                <TableCell>
                  {report.assignedVolunteerId ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {report.volunteerName ? report.volunteerName.slice(0, 2).toUpperCase() : report.assignedVolunteerId.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-black text-indigo-600 leading-none uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                        {report.volunteerName || "NO NAME DATA"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-300 italic font-medium uppercase text-[10px] tracking-widest">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${
                    report.urgency === 'high' ? 'bg-red-50 text-red-500' : 
                    report.urgency === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {report.urgency}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-9 gap-2 shadow-sm border-border hover:bg-indigo-50 hover:text-indigo-600 font-bold uppercase text-[10px] tracking-widest"
                      onClick={() => setViewReportDialog(report)}
                    >
                      <Eye className="w-4 h-4" />
                      View Report
                    </Button>

                    {/* View Profile (only on rejected tab) */}
                    {activeTab === "rejected" && (
                      <Dialog open={profileReport?._id === report._id} onOpenChange={(open) => !open && setProfileReport(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 gap-2 shadow-sm border-border hover:bg-red-50 hover:text-red-600 font-bold uppercase text-[10px] tracking-widest"
                            onClick={() => setProfileReport(report)}
                          >
                            <User className="w-3.5 h-3.5" />
                            View Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 border-none shadow-2xl">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Rejected Report Profile</DialogTitle>
                            <DialogDescription>Why this report was rejected</DialogDescription>
                          </DialogHeader>
                          <div className="bg-red-600 rounded-t-2xl px-8 py-10 relative">
                            <button 
                              onClick={() => setProfileReport(null)}
                              className="absolute top-6 right-6 z-20 p-2 bg-card/10 hover:bg-card/20 text-white/70 hover:text-white rounded-full transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <p className="text-red-200 text-[10px] font-black uppercase tracking-widest">Report Rejected</p>
                                <p className="text-white font-black text-lg italic uppercase tracking-tight leading-none">{report.title || "Unnamed Report"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-2xl">
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</p>
                                <p className="text-sm font-bold text-slate-700 mt-0.5">{report.category}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Urgency</p>
                                <p className={`text-sm font-bold mt-0.5 ${report.urgency === 'high' ? 'text-red-600' : report.urgency === 'medium' ? 'text-amber-600' : 'text-blue-600'}`}>{report.urgency}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Location</p>
                                <p className="text-sm font-bold text-slate-700 mt-0.5 italic">{report.location.address}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filed On</p>
                                <p className="text-sm font-bold text-slate-700 mt-0.5">{new Date(report._creationTime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Description</p>
                              <p className="text-sm text-slate-600 font-medium italic border-l-4 border-red-100 pl-4 py-2 bg-red-50/40 rounded-r-xl">{report.description}</p>
                            </div>
                            {report.aiSummary && (
                              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI Synthesis</p>
                                <p className="text-xs text-indigo-900 font-medium leading-relaxed">{report.aiSummary}</p>
                              </div>
                            )}
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Rejection Reason</p>
                              <p className="text-sm text-red-700 font-medium italic">This report was reviewed by the super admin and determined to not meet the criteria for deployment or did not contain verifiable field data.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <Button 
                                variant="outline"
                                className="flex-1 rounded-xl border-border font-bold uppercase text-[10px] tracking-widest h-11"
                                onClick={() => setProfileReport(null)}
                              >
                                Close
                              </Button>
                              <Button 
                                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest h-11"
                                onClick={() => handleVerify(report._id, 'accepted')}
                              >
                                Accept & Activate
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Assign Volunteer (only on active tab) */}
                    {activeTab === "active" && (
                      <Dialog open={selectedReport?._id === report._id} onOpenChange={(open) => !open && setSelectedReport(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-9 gap-2 shadow-sm border-border font-bold uppercase text-[10px] tracking-widest transition-all ${
                              report.status === "assigned" ? "bg-amber-50 text-amber-600 border-amber-200" : "hover:bg-indigo-50 hover:text-indigo-600"
                            }`}
                            onClick={() => setSelectedReport(report)}
                            disabled={report.status === "resolved" || report.status === "assigned"}
                          >
                            <UserPlus className="w-4 h-4" />
                            {report.status === "assigned" ? "Assigned" : "Assign"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] rounded-2xl p-8 border-none shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black italic uppercase">Smart Dispatch</DialogTitle>
                            <DialogDescription className="font-medium text-muted-foreground italic mt-1">
                              Nearest 5 Personnel detected in proximity to {report.title}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-6">
                            {nearestVolunteers?.map((v: any) => (
                               <div 
                                 key={v._id} 
                                 className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${
                                   v.assignedReportsCount >= 2 
                                     ? "border-amber-100 bg-amber-50/20 cursor-not-allowed" 
                                     : "border-border hover:border-indigo-200 hover:bg-indigo-50/50"
                                 }`}
                                 onClick={() => {
                                   if (v.assignedReportsCount >= 2) return;
                                   handleAssign(v.userId);
                                 }}
                               >
                                 <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden border-2 shadow-sm ${
                                     v.assignedReportsCount >= 2 ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-indigo-100 text-indigo-600 border-white"
                                   }`}>
                                     {v.imageUrl ? (
                                       <img src={v.imageUrl} className="w-full h-full object-cover" />
                                     ) : v.name[0]}
                                   </div>
                                   <div>
                                     <p className={`font-bold ${v.assignedReportsCount >= 2 ? "text-amber-800" : "text-foreground"}`}>{v.name}</p>
                                     <p className={`text-[10px] font-black uppercase tracking-widest ${v.assignedReportsCount >= 2 ? "text-amber-400" : "text-indigo-400"}`}>
                                       ~{(v.distance * 111).toFixed(1)} km away
                                     </p>
                                   </div>
                                 </div>
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   disabled={v.assignedReportsCount >= 2}
                                   className={`rounded-xl font-black uppercase text-[10px] transition-all ${
                                     v.assignedReportsCount >= 2 
                                       ? "bg-amber-100 text-amber-600 cursor-not-allowed opacity-100" 
                                       : "group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                                   }`}
                                 >
                                   {v.assignedReportsCount >= 2 ? "Busy" : "Deploy"}
                                 </Button>
                               </div>
                            ))}
                            {nearestVolunteers?.length === 0 && (
                              <div className="p-8 text-center text-muted-foreground font-medium italic">No available personnel within range.</div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      onClick={() => handleDelete(report._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayReports.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    {activeTab === "rejected" ? (
                      <CheckCircle2 className="w-12 h-12 text-slate-100" />
                    ) : (
                      <FileText className="w-12 h-12 text-slate-100" />
                    )}
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                      {activeTab === "rejected" ? "No rejected reports." : 
                       activeTab === "resolved" ? "No resolutions found." :
                       activeTab === "all" ? "No records in ledger." :
                       "No active reports."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ReportDetailDialog 
        reportId={viewReportDialog?._id || null} 
        isOpen={!!viewReportDialog} 
        onOpenChange={(open) => !open && setViewReportDialog(null)} 
      />
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={`rounded-3xl border ${className}`}>{children}</div>;
}

