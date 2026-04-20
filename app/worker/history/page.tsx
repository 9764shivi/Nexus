"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { History, MapPin, Calendar, ChevronLeft, Pencil, Send, XCircle, AlertTriangle, Image as ImageIcon, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function WorkerHistoryPage() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const rawReports = useQuery(api.reports.getReports, user ? { workerId: user._id } : "skip");
  const reports = rawReports ? (Array.isArray(rawReports) ? rawReports : (rawReports as any).page) : undefined;

  const editAndResubmit = useMutation(api.reports.editAndResubmitReport);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);

  // Edit dialog state
  const [editReport, setEditReport] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", urgency: "medium" as "low" | "medium" | "high", category: "" });
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = (report: any) => {
    setEditForm({
      title: report.title || "",
      description: report.description || "",
      urgency: report.urgency || "medium",
      category: report.category || "Other",
    });
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    setEditReport(report);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearNewPhoto = () => {
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
  };

  const handleResubmit = async () => {
    if (!editReport) return;
    if (!editForm.description.trim()) return toast.error("Description is required");
    setIsSaving(true);
    try {
      let newStorageId: any = undefined;

      // Upload new photo if selected
      if (newPhotoFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": newPhotoFile.type },
          body: newPhotoFile,
        });
        const { storageId } = await result.json();
        newStorageId = storageId;
      }

      await editAndResubmit({
        reportId: editReport._id,
        title: editForm.title,
        description: editForm.description,
        urgency: editForm.urgency,
        category: editForm.category,
        ...(newStorageId ? { reportPhoto: newStorageId } : {}),
      });
      toast.success("Report resubmitted to admin for review!");
      setEditReport(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to resubmit report");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !reports) return (
    <div className="p-8 text-center font-bold text-muted-foreground animate-pulse">Loading your history...</div>
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight italic uppercase">Survey History</h1>
          <p className="text-muted-foreground font-medium">Log of all reports filed by you in the field.</p>
        </div>
      </div>

      <div className="space-y-6">
        {reports.map((report: any) => (
          <Card
            key={report._id}
            className={`rounded-2xl border-none shadow-xl bg-card overflow-hidden group transition-all border-2 ${
              report.verificationStatus === "rejected"
                ? "border-red-100 ring-2 ring-red-50"
                : report.status === "resolved" 
                  ? "border-transparent hover:ring-4 hover:ring-emerald-500/20 hover:border-emerald-500/20"
                  : "border-transparent hover:ring-4 ring-indigo-50"
            }`}
          >
            <CardContent className="p-8">
              {/* Rejected notice banner */}
              {report.verificationStatus === "rejected" && (
                <div className="flex items-center gap-3 mb-5 bg-red-50 border border-red-100 rounded-2xl px-5 py-3">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest">Report Rejected by Admin</p>
                    <p className="text-xs text-red-400 font-medium mt-0.5">
                      Please edit and resubmit to send for review again.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openEdit(report)}
                    className="shrink-0 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest gap-1.5 h-9"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit & Resubmit
                  </Button>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={report.status} />
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      report.urgency === 'high' ? 'bg-red-50 text-red-500' : 
                      report.urgency === 'medium' ? 'bg-amber-50 text-amber-500' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                      {report.urgency} Urgency
                    </span>
                    {report.verificationStatus && (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        report.verificationStatus === 'accepted' ? 'bg-green-50 text-green-600' : 
                        report.verificationStatus === 'rejected' ? 'bg-red-50 text-red-600' : 
                        'bg-amber-50 text-amber-600'
                      }`}>
                        Admin: {report.verificationStatus}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-foreground leading-none mb-2">{report.title}</h3>
                    <p className="text-muted-foreground font-medium italic line-clamp-2">{report.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-muted-foreground" />
                       <span className="text-xs font-bold text-slate-600">{report.location.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-muted-foreground" />
                       <span className="text-xs font-bold text-slate-600">{new Date(report._creationTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {report.aiSummary && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI Analysis</p>
                      <p className="text-xs text-indigo-900 font-medium">{report.aiSummary}</p>
                    </div>
                  )}
                </div>

                {report.reportPhoto && (
                  <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden shadow-inner border-4 border-slate-50 shrink-0">
                     <img 
                       src={report.reportPhoto} 
                       alt="Report" 
                       className="w-full h-full object-cover transition-all hover:scale-105"
                     />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {reports.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-card rounded-3xl shadow-xl shadow-slate-100/10">
            <div className="flex justify-center">
              <History className="w-16 h-16 text-slate-100" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm italic">No entries in your log yet.</p>
          </div>
        )}
      </div>

      {/* Edit & Resubmit Dialog */}
      <Dialog open={!!editReport} onOpenChange={(open) => !open && setEditReport(null)}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl p-0 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit and Resubmit Report</DialogTitle>
            <DialogDescription>Update your rejected report and resubmit to admin</DialogDescription>
          </DialogHeader>

          {/* Header */}
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-900/50 rounded-t-[2rem] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Edit Rejected Report</p>
                <p className="text-white font-black text-lg italic uppercase tracking-tight leading-none mt-0.5">
                  Revise & Resubmit
                </p>
              </div>
            </div>
            <div className="mt-3 bg-red-900/30 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs font-medium leading-relaxed">
                Your original report was rejected. Fix the issues below and resubmit — it will go back to admin for a fresh review.
              </p>
            </div>
          </div>

          <div className="p-8 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Incident Headline</Label>
              <Input
                placeholder="Brief title of the incident..."
                className="rounded-2xl border-border bg-muted/50 h-12 font-bold"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            {/* Category + Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger className="rounded-2xl border-border bg-muted/50 h-12 font-bold">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Food">Food Crisis</SelectItem>
                    <SelectItem value="Health">Health Emergency</SelectItem>
                    <SelectItem value="Shelter">Shelter/Habitat</SelectItem>
                    <SelectItem value="Other">Other Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Urgency</Label>
                <Select value={editForm.urgency} onValueChange={(v: any) => setEditForm({ ...editForm, urgency: v })}>
                  <SelectTrigger className="rounded-2xl border-border bg-muted/50 h-12 font-bold">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">Critical / SOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Field Description</Label>
              <textarea
                className="w-full h-36 rounded-2xl border border-border bg-muted/50 p-4 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                placeholder="Provide a detailed, accurate situational analysis..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
              />
            </div>

            {/* Photo Reupload */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Visual Evidence (Photo)</Label>
              
              {/* Current photo preview */}
              {editReport?.reportPhoto && !newPhotoPreview && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-border">
                  <img src={editReport.reportPhoto} alt="Current" className="w-full h-40 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent py-3 px-4">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Current Photo (will be kept if no new upload)</p>
                  </div>
                </div>
              )}

              {/* New photo preview */}
              {newPhotoPreview && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-200">
                  <img src={newPhotoPreview} alt="New" className="w-full h-40 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-indigo-900/60 to-transparent py-3 px-4 flex items-end justify-between">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">New Photo</p>
                    <button onClick={clearNewPhoto} className="text-white/80 hover:text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload button */}
              <div>
                <input
                  type="file"
                  id="reupload-photo"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <label
                  htmlFor="reupload-photo"
                  className={`flex items-center justify-center gap-3 h-14 w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all font-bold text-sm ${
                    newPhotoFile
                      ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                      : "border-border hover:border-indigo-200 hover:bg-indigo-50/50 text-muted-foreground hover:text-indigo-500"
                  }`}
                >
                  {newPhotoFile ? (
                    <><CheckCircle2 className="w-5 h-5 text-indigo-500" /><span className="text-sm truncate max-w-[200px]">{newPhotoFile.name}</span></>
                  ) : (
                    <><ImageIcon className="w-5 h-5" /><span>Upload new photo</span></>
                  )}
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-border font-bold uppercase text-[10px] tracking-widest h-12"
                onClick={() => setEditReport(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest h-12 gap-2"
                onClick={handleResubmit}
                disabled={isSaving || !editForm.description.trim()}
              >
                <Send className="w-4 h-4" />
                {isSaving ? "Resubmitting..." : "Resubmit to Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

