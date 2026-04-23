"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { 
  AlertCircle, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Camera,
  Navigation,
  CheckCircle,
  History,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Send,
  Loader2,
  UploadCloud,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function VolunteerTasksPage() {
  const user = useQuery(api.users.currentUser);
  const tasks = useQuery(api.reports.getReports, user ? { assignedVolunteerId: user._id } : "skip");
  const resolveTask = useMutation(api.reports.resolveReport);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const resubmitResolution = useMutation(api.reports.resubmitResolution);

  // Resolve dialog state
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestHelp = useMutation(api.reports.requestHelp);

  // Help dialog state
  const [helpDialog, setHelpDialog] = useState<any>(null);
  const [helpDescription, setHelpDescription] = useState("");

  // Resubmit dialog state
  const [resubmitDialog, setResubmitDialog] = useState<any>(null);
  const [resubmitNotes, setResubmitNotes] = useState("");
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitPreview, setResubmitPreview] = useState<string | null>(null);
  const resubmitFileRef = useRef<HTMLInputElement>(null);

  const openResolveDialog = (task: any) => {
    setResolveDialog(task);
    setResolutionNotes("");
    setSelectedFile(null);
    setFilePreview(null);
  };

  const openHelpDialog = (task: any) => {
    setHelpDialog(task);
    setHelpDescription("");
  };

  const openResubmitDialog = (task: any) => {
    setResubmitDialog(task);
    setResubmitNotes(task.resolutionNotes || "");
    setResubmitFile(null);
    setResubmitPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "resolve" | "resubmit") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === "resolve") { setSelectedFile(file); setFilePreview(ev.target?.result as string); }
      else { setResubmitFile(file); setResubmitPreview(ev.target?.result as string); }
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File) => {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const { storageId } = await result.json();
    return storageId;
  };

  const handleResolveSubmit = async () => {
    if (!resolveDialog) return;
    if (!resolutionNotes.trim()) return toast.error("Resolution description is required");
    if (!selectedFile) return toast.error("Evidence photo is required");
    setIsSubmitting(true);
    try {
      const storageId = await uploadFile(selectedFile);
      await resolveTask({ reportId: resolveDialog._id, resolutionPhoto: storageId, notes: resolutionNotes });
      toast.success("Mission resolution submitted for admin review!");
      setResolveDialog(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit resolution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitSubmit = async () => {
    if (!resubmitDialog) return;
    if (!resubmitNotes.trim()) return toast.error("Resolution description is required");
    if (!resubmitFile && !resubmitDialog.resolutionPhoto) return toast.error("Evidence photo is required");
    setIsSubmitting(true);
    try {
      let storageId = undefined;
      if (resubmitFile) storageId = await uploadFile(resubmitFile);
      await resubmitResolution({ reportId: resubmitDialog._id, notes: resubmitNotes, ...(storageId ? { resolutionPhoto: storageId } : {}) });
      toast.success("Resolution resubmitted for admin review!");
      setResubmitDialog(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to resubmit resolution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpSubmit = async () => {
    if (!helpDialog) return;
    if (!helpDescription.trim()) return toast.error("Description is required");
    setIsSubmitting(true);
    try {
      await requestHelp({ reportId: helpDialog._id, description: helpDescription });
      toast.success("Help request sent to admin!");
      setHelpDialog(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send help request");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!user || !tasks) return <div className="p-8 text-center font-bold text-muted-foreground">Syncing with Nexus...</div>;

  const reports = Array.isArray(tasks) ? tasks : (tasks as any)?.page || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight italic uppercase">My Rescue Missions</h1>
        <p className="text-muted-foreground font-medium italic">Active reports currently assigned to you for resolution.</p>
      </div>

      {/* Active Tasks */}
      <div className="grid gap-6">
        {reports.filter((t: any) => t.status === "assigned" || t.status === "open").map((task: any) => (
          <Card key={task._id} className="rounded-2xl border-none shadow-xl bg-card overflow-hidden group hover:ring-4 ring-indigo-50 transition-all">
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-64 bg-muted/50 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-border">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner ${
                  task.urgency === 'high' ? 'bg-red-100 text-red-500' : 
                  task.urgency === 'medium' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'
                }`}>
                  <AlertCircle className="w-10 h-10" />
                </div>
              </div>
              <div className="flex-1 p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <StatusBadge status={task.status} />
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          task.urgency === 'high' ? 'bg-red-50 text-red-500' : 
                          task.urgency === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                        }`}>
                          {task.urgency} Priority
                        </span>
                    </div>
                    <CardTitle className="text-2xl font-black text-foreground tracking-tight leading-none mb-2">
                      {task.title || "Untitled Incident"}
                    </CardTitle>
                    <p className="text-muted-foreground font-medium line-clamp-2 italic">{task.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><MapPin className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Location</p>
                      <p className="text-sm font-bold text-slate-700">{task.location.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Clock className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assigned At</p>
                      <p className="text-sm font-bold text-slate-700">{formatDate(task.assignedAt || task._creationTime)}</p>
                    </div>
                  </div>
                </div>
                {task.helpStatus === "provided" && (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> Admin Support Provided
                      </p>
                      <p className="text-[9px] font-black text-emerald-400 uppercase italic">{formatDate(task.helpProvidedAt)}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-900 italic leading-relaxed">
                      {task.helpResponse}
                    </p>
                  </div>
                )}
                {task.helpStatus === "requested" && (
                  <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-2 animate-pulse">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Help Request Pending
                      </p>
                      <p className="text-[9px] font-black text-amber-400 uppercase italic">{formatDate(task.helpRequestedAt)}</p>
                    </div>
                    <p className="text-xs font-medium text-amber-800 italic">
                      " {task.helpRequest} "
                    </p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-48 p-6 flex flex-col justify-center gap-3 bg-muted/50">
                <Button 
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                  onClick={() => openResolveDialog(task)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  RESOLVE
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 font-black gap-2 transition-all active:scale-95"
                  onClick={() => openHelpDialog(task)}
                  disabled={task.helpStatus === "requested"}
                >
                  <AlertTriangle className="w-4 h-4" />
                  NEED HELP
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl border-border font-bold gap-2 text-muted-foreground hover:bg-card hover:text-indigo-600 transition-all">
                  <Navigation className="w-4 h-4" />
                  MAP
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {reports.filter((t: any) => t.status === "assigned" || t.status === "open").length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="flex justify-center flex-col items-center opacity-20">
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-2" />
              <h3 className="text-2xl font-black text-foreground uppercase italic">All Clear</h3>
            </div>
            <p className="text-muted-foreground font-medium">No active tasks assigned to you. Take some rest!</p>
          </div>
        )}
      </div>


      {/* === WAITING LIST === */}
      {reports.filter((t: any) => t.status === "pending" || t.status === "rejected").length > 0 && (
        <div className="pt-10 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-50">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground uppercase italic">Waiting for Review</h2>
              <p className="text-xs text-muted-foreground font-medium">Resolutions pending admin verification</p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full bg-amber-100 text-amber-600 font-black text-[10px] uppercase tracking-widest">
              {reports.filter((t: any) => t.status === "pending" || t.status === "rejected").length} pending
            </span>
          </div>
          <div className="grid gap-4">
            {reports.filter((t: any) => t.status === "pending" || t.status === "rejected").map((task: any) => (
              <Card key={task._id} className={`rounded-2xl border-2 shadow-lg bg-card overflow-hidden transition-all ${
                task.resolutionVerificationStatus === "rejected"
                  ? "border-red-100 ring-2 ring-red-50/60"
                  : "border-amber-100 ring-1 ring-amber-50"
              }`}>
                <CardContent className="p-0">
                  {/* Status bar at top */}
                  <div className={`px-6 py-3 flex items-center gap-3 ${
                    task.resolutionVerificationStatus === "rejected" ? "bg-red-50 border-b border-red-100" : "bg-amber-50/70 border-b border-amber-100"
                  }`}>
                    {task.resolutionVerificationStatus === "rejected" ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-black text-red-600 uppercase tracking-widest">Resolution Rejected by Admin</p>
                          <p className="text-[10px] text-red-400 font-medium mt-0.5">Please revise and resubmit.</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openResubmitDialog(task)}
                          className="shrink-0 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest gap-1.5 h-8 px-3"
                        >
                          <Pencil className="w-3 h-3" /> Resubmit
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Awaiting Admin Review</p>
                        <span className="ml-auto text-[10px] font-bold text-amber-500">Submitted</span>
                      </>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-6 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-black text-foreground text-base leading-tight">{task.title || "Untitled Mission"}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {task.location.address}
                      </p>
                      {task.resolutionNotes && (
                        <div className="mt-3 bg-muted/50 rounded-xl p-3 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Your Resolution Notes</p>
                          <p className="text-xs text-slate-600 italic line-clamp-2">{task.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-300 block">{new Date(task._creationTime).toLocaleDateString()}</span>
                      <span className={`mt-2 inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        task.urgency === 'high' ? 'bg-red-50 text-red-500' :
                        task.urgency === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                      }`}>{task.urgency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* === RESOLUTION HISTORY (Admin Accepted) === */}
      {reports.filter((t: any) => t.status === "resolved").length > 0 && (
        <div className="pt-10 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-50">
              <History className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground uppercase italic">Resolution History</h2>
              <p className="text-xs text-muted-foreground font-medium">Missions successfully verified by admin</p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
              {reports.filter((t: any) => t.status === "resolved").length} completed
            </span>
          </div>
          <div className="grid gap-4">
            {reports.filter((t: any) => t.status === "resolved").map((task: any) => (
              <Card key={task._id} className="rounded-2xl border-none shadow-md bg-card overflow-hidden border-2 border-emerald-100 opacity-90 hover:opacity-100 transition-all">
                <CardContent className="p-0">
                  <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Admin Verified & Accepted</p>
                    <span className="ml-auto text-[10px] font-bold text-emerald-500">Mission Complete</span>
                  </div>
                  <div className="p-6 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-black text-foreground text-base leading-tight">{task.title || "Untitled Mission"}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {task.location.address}
                      </p>
                      {task.resolutionNotes && (
                        <p className="text-xs text-slate-500 italic mt-2 line-clamp-1">{task.resolutionNotes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-300 block">{new Date(task._creationTime).toLocaleDateString()}</span>
                      <Badge variant="outline" className="mt-2 bg-emerald-50 border-emerald-100 text-emerald-600 font-black uppercase text-[9px]">Resolved</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      <Dialog open={!!resolveDialog} onOpenChange={(open) => !open && setResolveDialog(null)}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-0 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Submit Mission Resolution</DialogTitle>
            <DialogDescription>Provide resolution details for admin review</DialogDescription>
          </DialogHeader>

          {/* Header */}
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-900/50 rounded-t-3xl p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mission Closure Report</p>
                <p className="text-white font-black text-lg italic uppercase tracking-tight leading-none mt-0.5">
                  {resolveDialog?.title || "Resolve Task"}
                </p>
              </div>
            </div>
            <div className="mt-4 bg-amber-900/30 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs font-medium">Both the resolution description and evidence photo are mandatory before submission.</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Resolution Description */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Resolution Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="w-full h-32 rounded-2xl border border-border bg-muted/50 p-4 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                placeholder="Describe how the situation was resolved, actions taken, and current status..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            {/* Evidence Photo */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Evidence Photo <span className="text-red-500">*</span>
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full aspect-video rounded-2xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative group ${
                  filePreview ? 'border-emerald-200 bg-emerald-50/30' : 'border-border hover:border-indigo-200 hover:bg-indigo-50/20'
                }`}
              >
                {filePreview ? (
                  <>
                    <img src={filePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-muted shadow-sm"><UploadCloud className="w-8 h-8 text-indigo-400" /></div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-600">Tap to upload evidence photo</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase italic">JPEG or PNG required</p>
                    </div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, "resolve")} />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest" onClick={() => setResolveDialog(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2"
                onClick={handleResolveSubmit}
                disabled={isSubmitting || !resolutionNotes.trim() || !selectedFile}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? "Submitting..." : "Submit to Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resubmit Resolution Modal */}
      <Dialog open={!!resubmitDialog} onOpenChange={(open) => !open && setResubmitDialog(null)}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-0 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Resubmit Resolution</DialogTitle>
            <DialogDescription>Update your rejected resolution and resubmit for admin review</DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-tr from-slate-900 to-red-900/30 rounded-t-3xl p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Edit Resolution</p>
                <p className="text-white font-black text-lg italic uppercase tracking-tight leading-none mt-0.5">Revise & Resubmit</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Updated Resolution Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="w-full h-32 rounded-2xl border border-border bg-muted/50 p-4 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                value={resubmitNotes}
                onChange={(e) => setResubmitNotes(e.target.value)}
                placeholder="Describe how the situation was resolved..."
              />
            </div>

            {/* Existing photo preview */}
            {resubmitDialog?.resolutionPhoto && !resubmitPreview && (
              <div className="relative rounded-xl overflow-hidden border-2 border-border">
                <img src={resubmitDialog.resolutionPhoto} alt="Current evidence" className="w-full h-40 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-3 px-4">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Current Photo (will be kept if no new upload)</p>
                </div>
              </div>
            )}

            {resubmitPreview && (
              <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200">
                <img src={resubmitPreview} alt="New evidence" className="w-full h-40 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-indigo-900/60 to-transparent py-3 px-4 flex justify-between items-end">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">New Photo</p>
                  <button onClick={() => { setResubmitFile(null); setResubmitPreview(null); }} className="text-white/80 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <input type="file" ref={resubmitFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "resubmit")} />
            <button
              onClick={() => resubmitFileRef.current?.click()}
              className="flex items-center justify-center gap-3 h-12 w-full rounded-xl border-2 border-dashed border-border hover:border-indigo-200 hover:bg-indigo-50/30 font-bold text-sm text-muted-foreground hover:text-indigo-500 transition-all"
            >
              <ImageIcon className="w-4 h-4" /> Upload New Photo
            </button>

            <div className="flex gap-4 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest" onClick={() => setResubmitDialog(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2"
                onClick={handleResubmitSubmit}
                disabled={isSubmitting || !resubmitNotes.trim()}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? "Resubmitting..." : "Resubmit to Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Need Help Modal */}
      <Dialog open={!!helpDialog} onOpenChange={(open) => !open && setHelpDialog(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Request Assistance</DialogTitle>
            <DialogDescription>Submit a help request for the current mission.</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 p-8 relative">
            <button 
              onClick={() => setHelpDialog(null)}
              className="absolute top-6 right-6 z-20 p-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Assistance Request</p>
                <p className="text-white font-black text-lg italic uppercase tracking-tight mt-1">Need Help?</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-card">
            <div className="space-y-3">
              <Label className="text-sm font-black text-foreground uppercase tracking-tight italic">
                What type of help do you need?
              </Label>
              <textarea
                className="w-full h-40 rounded-2xl border border-border bg-muted/30 p-4 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                placeholder="Briefly describe the support or resources you require..."
                value={helpDescription}
                onChange={(e) => setHelpDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest" onClick={() => setHelpDialog(null)}>
                Dismiss
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2"
                onClick={handleHelpSubmit}
                disabled={isSubmitting || !helpDescription.trim()}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
