"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/map-component"), { ssr: false });
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { Badge } from "./ui/badge";
import { 
  MapPin, 
  Calendar, 
  User, 
  AlertTriangle, 
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  FileText,
  X,
  History,
  Users,
  ClipboardCheck,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ReportDetailDialogProps {
  reportId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailDialog({ reportId, isOpen, onOpenChange }: ReportDetailDialogProps) {
  const [showImage, setShowImage] = useState(false);
  const [helpResponseText, setHelpResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const report = useQuery(api.reports.getReport, reportId ? { id: reportId as any } : "skip");
  const updateVerification = useMutation(api.reports.updateVerification);
  const verifyResolution = useMutation(api.reports.verifyResolution);
  const provideHelp = useMutation(api.reports.provideHelp);

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

  const handleOpenChange = (open: boolean) => {
    if (!open) setShowImage(false);
    onOpenChange(open);
  };

  const handleVerify = async (status: "accepted" | "rejected") => {
    if (!reportId) return;
    try {
      await updateVerification({ reportId: reportId as any, status });
      toast.success(`Report ${status} successfully`);
    } catch(e) {
      toast.error("Failed to update report status");
      console.error("Failed to update status", e);
    }
  };

  const handleVerifyResolution = async (status: "accepted" | "rejected") => {
    if (!reportId) return;
    try {
      await verifyResolution({ reportId: reportId as any, status });
      toast.success(`Resolution ${status}`);
    } catch (e) {
      toast.error("Failed to verify resolution");
      console.error("Failed to update resolution status", e);
    }
  };

  const handleSendHelp = async () => {
    if (!reportId || !helpResponseText.trim()) return;
    setIsSubmitting(true);
    try {
      await provideHelp({ reportId: reportId as any, response: helpResponseText });
      toast.success("Support instructions dispatched");
      setHelpResponseText("");
    } catch (e) {
      toast.error("Failed to dispatch support");
      console.error("Failed to send help", e);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!report && isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{report ? report.title || "Incident Report" : "Loading Report"}</DialogTitle>
          <DialogDescription>
            Detailed situational analysis and field data for incident {reportId}.
          </DialogDescription>
        </DialogHeader>
        {report && (
          <div className="flex flex-col">
            {/* Header Section */}
            <div className="relative pt-20 pb-8 px-8 bg-slate-900 overflow-hidden rounded-t-3xl">
               <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-indigo-900/30" />
               <button 
                 onClick={() => handleOpenChange(false)}
                 className="absolute top-6 right-6 z-20 p-2 bg-card/10 hover:bg-card/20 text-white/70 hover:text-white rounded-full transition-all"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <Badge className={`${
                      report.urgency === 'high' ? 'bg-red-500' : report.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    } text-white border-none uppercase font-black text-[10px] tracking-widest`}>
                      {report.urgency} Urgency
                    </Badge>
                    <StatusBadge status={report.status} />
                    {report.verificationStatus && (
                      <Badge className={`border-none uppercase font-black text-[10px] tracking-widest text-white ${
                        report.verificationStatus === 'accepted' ? 'bg-green-500' : report.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                      }`}>
                         Admin: {report.verificationStatus}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mt-2">
                    {report.title || "Incident Report"}
                  </h2>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Initial Log: {formatDate(report._creationTime)}
                  </p>
               </div>
            </div>

            <div className="p-8 space-y-8 bg-card">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Incident Location
                  </p>
                  <div className="h-48 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner relative">
                    <Map 
                      center={[report.location.lat, report.location.lng]} 
                      zoom={15} 
                      markers={[{ id: report._id, position: [report.location.lat, report.location.lng], title: report.title || "Incident Report", type: "report", urgency: report.urgency }]} 
                      interactive={false}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Address</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5 italic leading-tight">{report.location.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</p>
                      <p className="text-sm font-black text-indigo-600 mt-1 italic uppercase">{report.category}</p>
                    </div>
                  </div>
               </div>

               {/* Timeline Section */}
               <div className="bg-muted/30 p-5 rounded-2xl border border-border space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><History className="w-3 h-3" /> Mission Timeline</p>
                  <div className="space-y-2">
                    {report.verifiedAt && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[10px]">Verified & Accepted</span>
                        <span className="text-foreground font-black italic">{formatDate(report.verifiedAt)}</span>
                      </div>
                    )}
                    {report.assignedAt && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-bold uppercase tracking-tight text-[10px]">Personnel Deployed</span>
                        <span className="text-foreground font-black italic">{formatDate(report.assignedAt)}</span>
                      </div>
                    )}
                    {report.helpRequestedAt && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-amber-500 font-bold uppercase tracking-tight text-[10px]">Help Requested</span>
                        <span className="text-amber-600 font-black italic">{formatDate(report.helpRequestedAt)}</span>
                      </div>
                    )}
                    {report.helpProvidedAt && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-emerald-500 font-bold uppercase tracking-tight text-[10px]">Help Dispatched</span>
                        <span className="text-emerald-600 font-black italic">{formatDate(report.helpProvidedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>


               <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description & Findings</p>
                  <p className="text-slate-600 font-medium leading-relaxed italic border-l-4 border-border pl-4 bg-muted/50/50 py-4 rounded-r-2xl">
                    {report.description}
                  </p>
               </div>

                {report.aiSummary && (
                 <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3" /> AI Synthesis
                    </p>
                    <p className="text-sm font-bold text-indigo-900 italic leading-relaxed">
                       {report.aiSummary}
                    </p>
                 </div>
               )}

               {report.reportPhoto && (
                 <div className="p-6 rounded-3xl bg-muted/50 border border-border space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
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
                       <div className="mt-4 rounded-2xl overflow-hidden border-4 border-border shadow-inner bg-muted relative">
                         <img 
                           src={report.reportPhoto} 
                           alt="Attached Evidence" 
                           className="w-full object-contain max-h-[400px]"
                         />
                       </div>
                    )}
                 </div>
               )}

               {/* Help Request Management */}
               {report.helpStatus === "requested" && (
                 <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-amber-600">
                       <AlertTriangle className="w-5 h-5" />
                       <p className="text-xs font-black uppercase tracking-widest">Assistance Requested</p>
                     </div>
                     <p className="text-[10px] font-black text-amber-500 italic uppercase">{formatDate(report.helpRequestedAt)}</p>
                   </div>
                   <p className="text-sm font-bold text-amber-900 italic leading-relaxed bg-white/50 p-4 rounded-xl border border-amber-100">
                     "{report.helpRequest}"
                   </p>
                   <div className="space-y-3">
                      <textarea
                        className="w-full h-24 p-3 rounded-xl border border-amber-200 bg-white text-sm font-medium focus:ring-2 ring-amber-500 outline-none resize-none"
                        placeholder="Provide support instructions for the volunteer..."
                        value={helpResponseText}
                        onChange={(e) => setHelpResponseText(e.target.value)}
                      />
                      <button 
                        className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                        onClick={handleSendHelp}
                        disabled={isSubmitting || !helpResponseText.trim()}
                      >
                        {isSubmitting ? "Dispatching Support..." : "Send Support Instructions"}
                      </button>
                   </div>
                 </div>
               )}

               {report.helpStatus === "provided" && (
                 <div className="bg-slate-50 p-6 rounded-2xl border border-border space-y-3">
                   <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Support Details Provided
                     </p>
                     <p className="text-[10px] font-black text-slate-400 italic uppercase">{formatDate(report.helpProvidedAt)}</p>
                   </div>
                   <div className="text-sm font-medium text-slate-700 italic bg-white p-4 rounded-xl border border-slate-100">
                     {report.helpResponse}
                   </div>
                 </div>
               )}

                {/* Personnel Section */}
                <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Users className="w-3 h-3" /> Mission Personnel</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                        {report.workerName?.[0]}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Field Officer</p>
                        <p className="text-sm font-bold text-slate-700 leading-none italic">{report.workerName}</p>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Joined: {formatDate(report.workerJoinedAt)}</p>
                      </div>
                    </div>
                    {report.assignedVolunteerId && (
                      <div className="flex items-center gap-3 border-l md:border-l border-border pl-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">
                          {report.volunteerName?.[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned Volunteer</p>
                          <p className="text-sm font-bold text-slate-700 leading-none italic">{report.volunteerName}</p>
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">Joined: {formatDate(report.volunteerJoinedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  
                   {/* Resolution Review Section */}
                   {(report.status === "pending" || report.status === "resolved") && (
                    <div className="border-t border-border pt-6 space-y-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <ClipboardCheck className="w-3 h-3 text-emerald-500" /> Resolution Audit
                      </p>

                      <div className="flex items-center justify-between gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest w-fit ${
                          report.resolutionVerificationStatus === "accepted" ? "bg-emerald-50 text-emerald-600" :
                          report.resolutionVerificationStatus === "rejected" ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-600"
                        }`}>
                          <Clock className="w-3 h-3" />
                          Status: {report.resolutionVerificationStatus || "Pending Review"}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase">Submitted At</p>
                          <p className="text-[10px] font-bold text-slate-700 italic leading-none">{formatDate(report.resolutionSubmittedAt)}</p>
                        </div>
                      </div>

                      {report.resolutionNotes && (
                        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Volunteer Notes</p>
                          <p className="text-sm font-medium text-slate-700 italic leading-relaxed">{report.resolutionNotes}</p>
                        </div>
                      )}

                      {report.resolutionPhoto && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Evidence of Resolution</p>
                          <div className="rounded-xl overflow-hidden border-4 border-emerald-100 shadow-inner">
                            <img src={report.resolutionPhoto} alt="Resolution Evidence" className="w-full object-contain max-h-60" />
                          </div>
                        </div>
                      )}

                      {report.resolutionVerificationStatus !== "accepted" && (
                        <div className="flex gap-3 pt-2">
                          <button
                            className="flex-1 px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                            onClick={() => handleVerifyResolution("rejected")}
                          >
                            Reject Resolution
                          </button>
                          <button
                            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                            onClick={() => handleVerifyResolution("accepted")}
                          >
                            Accept Resolution
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                   {/* Accept / Reject buttons (only if not yet verified) */}
                  {report.status === "open" && (
                    <div className="flex gap-3 pt-6 border-t border-border">
                      <button 
                        onClick={() => handleVerify("rejected")}
                        className="flex-1 px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                        Reject Report
                      </button>
                      <button 
                        onClick={() => handleVerify("accepted")}
                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                        Accept Report
                      </button>
                    </div>
                  )}
               </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

