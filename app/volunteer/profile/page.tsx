"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCircle, CheckCircle2, XCircle, Tag, Settings, Save, Plus, Activity, Camera, Phone, Home, MapPin } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function VolunteerProfilePage() {
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.currentUser);
  const volunteers = useQuery(api.volunteers.getVolunteers, {}) as any;
  const updateVolunteerProfile = useMutation(api.volunteers.updateVolunteerProfile);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const toggleAvailability = useMutation(api.volunteers.updateAvailability);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  
  const [newSkill, setNewSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [editData, setEditData] = useState({
    phoneNumber: "",
    permanentAddress: "",
    temporaryAddress: "",
  });

  const volRecord = volunteers?.find((v: any) => v.userId === convexUser?._id);
  const [hasInitializedData, setHasInitializedData] = useState(false);

  // Initialize edit data when convexUser loads
  useEffect(() => {
    if (convexUser && !hasInitializedData) {
      setEditData({
        phoneNumber: (convexUser as any).phoneNumber || "",
        permanentAddress: (convexUser as any).permanentAddress || "",
        temporaryAddress: (convexUser as any).temporaryAddress || "",
      });
      setHasInitializedData(true);
    }
  }, [convexUser, hasInitializedData]);

  const handleToggleAvailability = async () => {
    if (!volRecord) return;
    try {
      await toggleAvailability({
        isAvailable: !volRecord.isAvailable,
      });
      toast.success(volRecord.isAvailable ? "Now Off-Duty" : "Now On-Duty");
    } catch (e) {
      toast.error("Status update failed");
    }
  };

  const handleMapSelect = async (lat: number, lng: number) => {
    try {
      toast.loading("Resolving tactical address...", { id: "geo-resolve" });
      
      // Reverse geocode to get address string
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      const resolvedAddress = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      // Update coordinates in database
      await updateVolunteerProfile({
        currentLocation: { lat, lng },
      });

      // PERSIST the address string immediately to the users table
      // so it remains set even after a page refresh.
      await updateUserProfile({
        temporaryAddress: resolvedAddress,
      });

      // Update local state for input field
      setEditData(prev => ({
        ...prev,
        temporaryAddress: resolvedAddress
      }));

      setIsMapOpen(false);
      toast.success("Tactical address resolved from Map", { id: "geo-resolve" });
    } catch (e) {
      toast.error("Failed to resolve location", { id: "geo-resolve" });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        ...editData,
      });
      toast.success("Identity profile updated");
    } catch (e) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoLoading(true);
    try {
      toast.loading("Uploading photo...", { id: "photo-upload" });

      // Step 1: Get a Convex upload URL
      const postUrl = await generateUploadUrl();

      // Step 2: Upload the file to Convex storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();

      // Step 3: Resolve storageId → real HTTP URL and save it to DB
      // updateProfileImage uses ctx.storage.getUrl() server-side
      await updateProfileImage({ storageId });

      // Step 4: Also sync the photo to Clerk so the Navbar updates
      if (clerkUser) {
        try {
          await clerkUser.setProfileImage({ file });
        } catch (clerkErr) {
          console.error("Clerk sync failed:", clerkErr);
        }
      }

      toast.success("Profile photo updated!", { id: "photo-upload" });
    } catch (e) {
      console.error("Photo upload error:", e);
      toast.error("Photo upload failed", { id: "photo-upload" });
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill || !volRecord) return;
    try {
      await updateVolunteerProfile({
        skills: [...volRecord.skills, newSkill],
      });
      setNewSkill("");
      toast.success("Skill added");
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!volRecord) return;
    try {
      await updateVolunteerProfile({
        skills: volRecord.skills.filter((s: string) => s !== skillToRemove),
      });
      toast.success("Skill removed");
    } catch (e) {
      toast.error("Update failed");
    }
  };

  if (!convexUser || !volRecord) return (
    <div className="h-[60vh] flex items-center justify-center">
       <Activity className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-3xl bg-indigo-100 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden mb-4 ring-4 ring-indigo-50 group">
             {convexUser.imageUrl ? (
               <img src={convexUser.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : clerkUser?.imageUrl ? (
               <img src={clerkUser.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <UserCircle className="w-16 h-16 text-indigo-400" />
             )}
             <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer rounded-3xl">
                <Camera className="w-8 h-8 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isPhotoLoading} />
             </label>
          </div>
          {isPhotoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-3xl">
              <Activity className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}
          <div className={`absolute bottom-6 right-0 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
            volRecord.isAvailable ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-300"
          }`}>
            {volRecord.isAvailable ? <CheckCircle2 className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
          </div>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none italic">{convexUser.name}</h1>
        <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-2">{convexUser.email}</p>
        
        {volRecord.currentLocation.lat !== 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
             <MapPin className="w-3 h-3 text-emerald-500" />
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter tabular-nums">
               {volRecord.currentLocation.lat.toFixed(4)}, {volRecord.currentLocation.lng.toFixed(4)}
             </span>
             <Badge variant="outline" className="text-[8px] border-emerald-100 text-emerald-500 px-1.5 py-0 rounded-md bg-emerald-50">SYNCED</Badge>
          </div>
        )}
      </div>

      <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
        <div className="bg-muted/50/50 p-8 border-b border-border flex items-center justify-between">
          <div>
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Dispatch Status</Label>
            <p className={`text-xl font-black uppercase italic mt-0.5 leading-none ${volRecord.isAvailable ? "text-emerald-600" : "text-muted-foreground"}`}>
              {volRecord.isAvailable ? "Ready for Action" : "Standby Mode"}
            </p>
          </div>
          <Button 
            onClick={handleToggleAvailability}
            className={`rounded-2xl font-black px-8 h-14 shadow-xl transition-all active:scale-95 text-xs tracking-widest uppercase ${
              volRecord.isAvailable ? "bg-card text-muted-foreground hover:bg-muted/50" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {volRecord.isAvailable ? "GO OFF-GRID" : "GO ON-DUTY"}
          </Button>
        </div>


        <CardContent className="p-10 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Identity & Logistics</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 rounded-lg gap-2"
              >
                <Save className="w-3 h-3" /> Save Changes
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-2xl border border-border group focus-within:ring-2 ring-indigo-100 transition-all">
                  <Phone className="w-4 h-4 text-indigo-400" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-sm font-bold text-slate-700 placeholder:text-slate-300 italic"
                    placeholder="Tactical Phone Number"
                    value={editData.phoneNumber}
                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-2xl border border-border group focus-within:ring-2 ring-indigo-100 transition-all">
                  <Home className="w-4 h-4 text-indigo-400" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-sm font-bold text-slate-700 placeholder:text-slate-300 italic"
                    placeholder="Permanent HQ Address"
                    value={editData.permanentAddress}
                    onChange={(e) => setEditData({...editData, permanentAddress: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Temporary Operations</Label>
                   <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                     <DialogTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg gap-1.5">
                         <MapPin className="w-3 h-3" /> Set on Map
                       </Button>
                     </DialogTrigger>
                     <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                       <DialogHeader className="p-6 bg-muted/50 border-b border-border">
                         <DialogTitle className="text-xl font-black uppercase italic text-foreground tracking-tight">Select Tactical Position</DialogTitle>
                         <p className="text-xs text-muted-foreground font-medium italic">Click on the mission grid to resolve your temporary ops coordinates.</p>
                       </DialogHeader>
                       <div className="flex-1 relative">
                         <Map 
                           center={volRecord.currentLocation.lat !== 0 ? [volRecord.currentLocation.lat, volRecord.currentLocation.lng] : [20.5937, 78.9629]}
                           zoom={12}
                           interactive={true}
                           onLocationSelect={handleMapSelect}
                           markers={volRecord.currentLocation.lat !== 0 ? [{
                             id: 'current-pos',
                             position: [volRecord.currentLocation.lat, volRecord.currentLocation.lng],
                             title: 'Selected Position',
                             type: 'volunteer'
                           }] : []}
                         />
                       </div>
                     </DialogContent>
                   </Dialog>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-2xl border border-border group focus-within:ring-2 ring-indigo-100 transition-all">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <input 
                    className="bg-transparent border-none focus:outline-none w-full text-sm font-bold text-slate-700 placeholder:text-slate-300 italic"
                    placeholder="Temporary Operations Address"
                    value={editData.temporaryAddress}
                    onChange={(e) => setEditData({...editData, temporaryAddress: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-10 border-t border-slate-50">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Field Expertise</Label>
            <div className="flex flex-wrap gap-2.5">
              {volRecord.skills.map((skill: string) => (
                <Badge 
                  key={skill} 
                  variant="outline" 
                  onClick={() => handleRemoveSkill(skill)}
                  className="rounded-xl px-4 py-2 border-border bg-muted/50 text-slate-600 font-bold text-xs gap-2 group cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                >
                  <Tag className="w-3 h-3 text-indigo-400 group-hover:text-red-400" />
                  {skill}
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Declare new capability..." 
                className="rounded-2xl bg-muted/50 border-none h-14 text-sm font-bold shadow-inner"
              />
              <Button 
                onClick={handleAddSkill}
                size="icon" 
                className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95"
              >
                <Plus className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 text-center">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Humanitarian ID: {convexUser._id.slice(0, 10)}</p>
      </div>
    </div>
  );
}

