"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle2, ChevronLeft, Loader2, MessageSquare, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function ResolveTaskPage() {
  const { id } = useParams();
  const router = useRouter();
  const reportData = useQuery(api.reports.getReport, { id: id as Id<"reports"> });
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const resolveReport = useMutation(api.reports.resolveReport);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportData) return;
    if (!notes.trim()) {
      toast.error("Please provide resolution notes.");
      return;
    }
    if (!selectedFile) {
      toast.error("Please provide an evidence photo.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let storageId = undefined;

      const postUrl = await generateUploadUrl();
      if (!postUrl) throw new Error("Could not generate upload URL");

      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
        body: selectedFile,
      });

      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Upload failed: ${result.statusText} (${result.status}) - ${errorText}`);
      }

      const { storageId: sid } = await result.json();
      storageId = sid;

      await resolveReport({
        reportId: id as Id<"reports">,
        resolutionPhoto: storageId,
        notes: notes,
      });

      toast.success("Mission Accomplished! Task resolved.");
      router.push("/volunteer/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit resolution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reportData) return <div className="p-8 text-center font-bold text-slate-400">Loading mission details...</div>;

  return (
    <div className="max-w-md mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Mission Closure</h1>
      </div>

      <Card className="rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
           <CardTitle className="text-xl font-black text-slate-800 uppercase italic leading-tight">
             {reportData.title}
           </CardTitle>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Resolution Protocol Active</p>
        </CardHeader>
        <CardContent className="p-8">
           <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidence Photo</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full aspect-video rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative group ${
                    selectedFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-100'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Preview" 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                         <UploadCloud className="w-8 h-8 text-indigo-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-600">Snap or Upload Proof</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase italic">JPEG or PNG required</p>
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resolution Description</Label>
                <div className="relative">
                  <Textarea 
                    placeholder="Describe how the situation was resolved..." 
                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-indigo-100 min-h-[120px] p-4 text-sm font-medium placeholder:text-slate-400"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="absolute right-4 bottom-4 p-2 bg-white rounded-xl shadow-sm ring-1 ring-slate-100">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resolution Status</Label>
                <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center gap-4">
                   <div className="p-2 rounded-xl bg-white shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   </div>
                   <p className="text-sm font-bold text-emerald-700 italic">Confirmed: Situation Stabilized</p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg gap-2 shadow-xl shadow-indigo-100 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    FINALIZE RESOLUTION
                  </>
                )}
              </Button>
           </form>
        </CardContent>
      </Card>
    </div>
  );
}
