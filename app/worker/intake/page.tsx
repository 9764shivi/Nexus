"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Image as ImageIcon, CheckCircle2, Navigation } from "lucide-react";
import { toast } from "sonner";

const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function WorkerIntakePage() {
  const router = useRouter();
  const createReport = useMutation(api.reports.createReport);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const summarizeReport = useAction(api.actions.summarizeReport);
  const categories = useQuery(api.reports.listCategories);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    urgency: "medium" as "low" | "medium" | "high",
  });

  const getGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast.success("GPS Location Captured");
        },
        () => toast.error("Could not find location")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return toast.error("Location is required");
    
    setLoading(true);
    try {
      let imageUrl = undefined;

      if (selectedFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        const { storageId } = await result.json();
        imageUrl = storageId;
      }

      let aiSummary = "Pending AI processing...";
      let aiUrgency = formData.urgency;
      try {
        const aiResult = await summarizeReport({ description: formData.description });
        aiSummary = aiResult.aiSummary;
        aiUrgency = aiResult.urgency;
      } catch (e) {
        console.error("AI summarization failed", e);
      }

      await createReport({
        ...formData,
        urgency: formData.urgency, // Use manual urgency selection
        aiSummary: aiSummary,
        location: { ...location, address: "Manual Intake Location" },
        reportPhoto: imageUrl, // Matched with backend arg name
      });
      toast.success("Report Submitted Successfully");
      router.push("/worker/history");
    } catch (e) {
      toast.error("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => router.back()}>
          <Navigation className="w-5 h-5 -rotate-90" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-none italic uppercase">New Survey</h1>
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Intake Form • Reality Verification</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-3xl border-none shadow-2xl bg-card p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Incident Headline</Label>
              <Input 
                placeholder="Brief title of the survey..." 
                className="rounded-2xl border-border bg-muted/50 h-12 font-bold"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="rounded-2xl border-border bg-muted/50 h-12 font-bold focus:ring-1">
                    <SelectValue placeholder={categories ? "Select category" : "Loading..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {categories === undefined && (
                      <SelectItem value="__loading" disabled>
                        Loading categories...
                      </SelectItem>
                    )}
                    {categories?.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No categories yet
                      </SelectItem>
                    )}
                    {categories?.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.name === v.name) === i).map((cat: any) => (
                      <SelectItem key={cat._id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Urgency</Label>
                <Select value={formData.urgency} onValueChange={(v: any) => setFormData({...formData, urgency: v})}>
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

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Field Description</Label>
              <textarea 
                className="w-full h-32 rounded-2xl border-border bg-muted/50 p-4 font-medium text-sm focus:outline-none focus:ring-1 ring-indigo-200"
                placeholder="Detailed situational analysis..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Geographic Evidence</Label>
              <div className="h-48 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner relative group">
                {location ? (
                  <Map 
                    center={[location.lat, location.lng]} 
                    zoom={15} 
                    markers={[{ id: "temp", position: [location.lat, location.lng], title: "Current Spot", type: "report" }]} 
                    onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
                    interactive={true}
                  />
                ) : (
                  <div className="h-full w-full bg-muted/50 flex flex-col items-center justify-center text-muted-foreground">
                    <MapPin className="w-12 h-12 mb-2 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-tighter">Satellite Lock Required</p>
                  </div>
                )}
                <Button 
                  type="button" 
                  onClick={getGPS}
                  className="absolute bottom-4 right-4 rounded-xl bg-card text-indigo-600 hover:bg-muted/50 shadow-xl font-black gap-2 h-10 border-2 border-indigo-100"
                >
                  <Navigation className="w-4 h-4" />
                  PIN GPS
                </Button>
              </div>
            </div>

    <div className="flex flex-col gap-4">
      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Visual Evidence</Label>
      <div className="flex items-center gap-4">
        <Input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          id="photo-upload"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <Button 
          type="button" 
          variant="outline" 
          asChild
          className="flex-1 h-24 rounded-2xl border-2 border-dashed border-border hover:bg-indigo-50 hover:border-indigo-200 transition-all font-bold gap-2 cursor-pointer"
        >
          <label htmlFor="photo-upload">
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                <span className="text-[10px] uppercase text-slate-600">{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                <span>Add Field Photo</span>
              </>
            )}
          </label>
        </Button>
        {selectedFile && (
          <Button 
            type="button" 
            variant="ghost" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
            onClick={() => setSelectedFile(null)}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
          </div>
        </Card>

        <Button 
          type="submit" 
          className="w-full h-20 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-xl font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
          disabled={loading || !location}
        >
          {loading ? "TRANSMITTING..." : "SUBMIT TO NEXUS"}
        </Button>
      </form>
    </div>
  );
}

