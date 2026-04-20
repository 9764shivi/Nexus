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
  X
} from "lucide-react";

interface ReportDetailDialogProps {
  reportId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailDialog({ reportId, isOpen, onOpenChange }: ReportDetailDialogProps) {
  const [showImage, setShowImage] = useState(false);
  const report = useQuery(api.reports.getReport, reportId ? { id: reportId as any } : "skip");
  const updateVerification = useMutation(api.reports.updateVerification);

  const handleOpenChange = (open: boolean) => {
    if (!open) setShowImage(false);
    onOpenChange(open);
  };

  const handleVerify = async (status: "accepted" | "rejected") => {
    if (!reportId) return;
    try {
      await updateVerification({ reportId: reportId as any, status });
      onOpenChange(false);
    } catch(e) {
      console.error("Failed to update status", e);
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
                      markers={[{ id: report._id, position: [report.location.lat, report.location.lng], title: report.title, type: "report", urgency: report.urgency }]} 
                      interactive={false}
                    />
                  </div>
                  <p className="text-sm font-bold text-slate-700 italic bg-muted/30 p-3 rounded-xl border border-slate-100">
                    {report.location.address}
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                       <Calendar className="w-3 h-3" /> Reported On
                     </p>
                     <p className="text-sm font-bold text-slate-700 italic">
                       {new Date(report._creationTime).toLocaleString()}
                     </p>
                  </div>
                  <div className="space-y-1 text-right">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Category</p>
                     <p className="text-sm font-black text-indigo-600 mt-1 italic uppercase">{report.category}</p>
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

                <div className="pt-8 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Field Personnel</p>
                        <p className="text-sm font-black text-foreground mt-1 italic uppercase">{report.workerName || "Reporting Officer"}</p>
                     </div>
                  </div>
                  
                  {report.status === "resolved" ? (
                    <div className="text-right">
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Mission Status</p>
                       <p className="text-sm font-black text-emerald-600 mt-1 italic uppercase flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-4 h-4" /> Finalized
                       </p>
                    </div>
                  ) : report.status === "assigned" ? (
                    <div className="text-right">
                       <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Mission Status</p>
                       <p className="text-sm font-black text-amber-600 mt-1 italic uppercase flex items-center gap-1 justify-end">
                          <Clock className="w-4 h-4" /> In Progress
                       </p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVerify("rejected")}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleVerify("accepted")}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Accept
                      </button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

