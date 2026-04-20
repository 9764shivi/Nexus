"use client";

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
  X
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const reportsData = useQuery(api.reports.getReports, {});
  const allReports = Array.isArray(reportsData) ? reportsData : (reportsData as any)?.page || [];

  // Split into active (non-rejected) and rejected
  const activeReports = allReports.filter((r: any) => r.verificationStatus !== "rejected");
  const rejectedReports = allReports.filter((r: any) => r.verificationStatus === "rejected");

  const assignReport = useMutation(api.reports.assignReport);
  const deleteReport = useMutation(api.reports.deleteReport);
  const updateVerification = useMutation(api.reports.updateVerification);

  const [activeTab, setActiveTab] = useState<"active" | "rejected">("active");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewReportDialog, setViewReportDialog] = useState<any>(null);
  const [profileReport, setProfileReport] = useState<any>(null);
  const [showImage, setShowImage] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const nearestVolunteers = useQuery(
    api.volunteers.getNearestVolunteers, 
    selectedReport ? { lat: selectedReport.location.lat, lng: selectedReport.location.lng } : "skip"
  );

  const handleVerify = async (reportId: any, status: "accepted" | "rejected") => {
    try {
      await updateVerification({ reportId, status });
      toast.success(`Report ${status}`);
      setViewReportDialog(null);
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

  const displayReports = activeTab === "active" ? activeReports : rejectedReports;

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
          onClick={() => setActiveTab("active")}
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
          onClick={() => setActiveTab("rejected")}
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
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium italic mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {report.location.address || "Coordinates recorded"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={report.status} />
                </TableCell>
                <TableCell>
                  {report.assignedVolunteerId ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {report.assignedVolunteerId.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-700 leading-none italic uppercase text-[10px]">Personnel Assigned</span>
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

                    {/* View Report Detail Dialog */}
                    <Dialog 
                      open={viewReportDialog?._id === report._id} 
                      onOpenChange={(open) => { if (!open) { setViewReportDialog(null); setShowImage(false); } }}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                          onClick={() => setViewReportDialog(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent showCloseButton={false} className="sm:max-w-[480px] rounded-2xl p-0 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="sr-only">
                          <DialogTitle>Report Details</DialogTitle>
                          <DialogDescription>Full details of the field worker report</DialogDescription>
                        </DialogHeader>
                        {/* Dark header */}
                        <div className="relative pt-20 pb-7 px-8 bg-slate-900 overflow-hidden rounded-t-2xl">
                          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-indigo-900/30" />
                          <button 
                            onClick={() => setViewReportDialog(null)}
                            className="absolute top-6 right-6 z-20 p-2 bg-card/10 hover:bg-card/20 text-white/70 hover:text-white rounded-full transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <div className="relative z-10">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white ${
                                report.urgency === 'high' ? 'bg-red-500' : report.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}>{report.urgency} Urgency</span>
                              <StatusBadge status={report.status} />
                              {report.verificationStatus === "rejected" && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500 text-white">Rejected</span>
                              )}
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-snug mt-1">
                              {report.title || "Incident Report"}
                            </h2>
                          </div>
                        </div>

                        <div className="p-8 space-y-6">
                          {/* Meta */}
                          <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-2xl">
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                              <p className="text-sm font-bold text-slate-700 mt-0.5 italic">{report.location.address}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</p>
                              <p className="text-sm font-bold text-slate-700 mt-0.5">{report.category}</p>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest"><FileText className="w-3 h-3 inline mr-1" />Description</p>
                            <p className="text-sm text-slate-600 font-medium italic border-l-4 border-border pl-4 bg-muted/50/50 py-3 rounded-r-2xl">{report.description}</p>
                          </div>

                          {/* AI Summary */}
                          {report.aiSummary && (
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI Synthesis</p>
                              <p className="text-xs text-indigo-900 font-medium leading-relaxed">{report.aiSummary}</p>
                            </div>
                          )}

                          {/* View Attached Image */}
                          {report.reportPhoto && (
                            <div className="bg-muted/50 p-4 rounded-2xl border border-border space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> Field Evidence
                                </p>
                                <button
                                  onClick={() => setShowImage(!showImage)}
                                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-card border border-border rounded-full hover:bg-muted text-slate-600 transition-colors"
                                >
                                  {showImage ? "Hide attached file" : "View attached file"}
                                </button>
                              </div>
                              {showImage && (
                                <div className="rounded-xl overflow-hidden border-4 border-border shadow-inner">
                                  <img src={report.reportPhoto} alt="Field Evidence" className="w-full object-contain max-h-80" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Accept / Reject buttons (only on active tab) */}
                          {activeTab === "active" && (
                            <div className="flex gap-4 pt-2 border-t border-border">
                              <Button variant="outline" className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold uppercase text-[10px] tracking-widest h-12" 
                                onClick={() => handleVerify(report._id, 'rejected')}>
                                Reject Report
                              </Button>
                              <Button className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest h-12" 
                                onClick={() => handleVerify(report._id, 'accepted')}>
                                Accept Report
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

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
                            <Button 
                              variant="outline"
                              className="w-full rounded-xl border-border font-bold uppercase text-[10px] tracking-widest h-11"
                              onClick={() => setProfileReport(null)}
                            >
                              Close
                            </Button>
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
                            className="h-9 gap-2 shadow-sm border-border hover:bg-indigo-50 hover:text-indigo-600 font-bold uppercase text-[10px] tracking-widest"
                            onClick={() => setSelectedReport(report)}
                            disabled={report.status === "resolved"}
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign
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
                            {nearestVolunteers?.map(v => (
                              <div 
                                key={v._id} 
                                className="flex items-center justify-between p-4 rounded-2xl border border-border hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                                onClick={() => handleAssign(v.userId)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 overflow-hidden border-2 border-white shadow-sm">
                                    {v.imageUrl ? (
                                      <img src={v.imageUrl} className="w-full h-full object-cover" />
                                    ) : v.name[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground">{v.name}</p>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">~{(v.distance * 111).toFixed(1)} km away</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors font-black uppercase text-[10px]">
                                  Deploy
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
                      {activeTab === "rejected" ? "No rejected reports." : "No active reports."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={`rounded-3xl border ${className}`}>{children}</div>;
}

