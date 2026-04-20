"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "./ui/badge";
import { 
  Mail, 
  MapPin, 
  User, 
  Tag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  Home,
  X
} from "lucide-react";

interface VolunteerDetailDialogProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VolunteerDetailDialog({ userId, isOpen, onOpenChange }: VolunteerDetailDialogProps) {
  const user = useQuery(api.users.getUser, userId ? { id: userId as any } : "skip");
  const volunteer = useQuery(api.volunteers.getVolunteerByUser, userId ? { userId: userId as any } : "skip");
  
  if (!user && isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[500px] rounded-3xl p-0 border-none shadow-2xl overflow-y-auto overflow-x-hidden max-h-[90vh] bg-muted/50">
        <DialogHeader className="sr-only">
          <DialogTitle>{user ? user.name : "Personnel Profile"}</DialogTitle>
          <DialogDescription>
            Detailed registry and operational status for volunteer {userId}.
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="flex flex-col">
            <div className="bg-indigo-600 p-10 flex flex-col items-center text-center relative overflow-hidden">
               <button 
                 onClick={() => onOpenChange(false)}
                 className="absolute top-6 right-6 z-20 p-2 bg-card/10 hover:bg-card/20 text-white/70 hover:text-white rounded-full transition-all"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="absolute top-0 left-0 w-full h-full opacity-10">
                 <div className="absolute -top-12 -right-12 w-64 h-64 bg-card rounded-full blur-3xl animate-pulse" />
               </div>
               
               <div className="w-24 h-24 rounded-3xl bg-card p-1 shadow-2xl mb-4 z-10">
                 {user.imageUrl ? (
                   <img 
                    src={user.imageUrl} 
                    alt={user.name} 
                    className="w-full h-full object-cover rounded-2xl" 
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                      <User className="w-10 h-10" />
                   </div>
                 )}
               </div>

               <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter z-10">{user.name}</h2>
               <div className="flex items-center gap-2 mt-2 z-10">
                 {user.isVerified ? (
                   <Badge className="bg-emerald-400 text-white border-none text-[10px] font-black uppercase tracking-widest gap-1">
                      <ShieldCheck className="w-3 h-3" /> Identity Verified
                   </Badge>
                 ) : (
                   <Badge className="bg-amber-400 text-white border-none text-[10px] font-black uppercase tracking-widest">
                      Pending Verification
                   </Badge>
                 )}
               </div>
            </div>

            <div className="p-8 space-y-6">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Contact & Registry</p>
                  <div className="grid grid-cols-1 gap-4">
                     <div className="flex items-start gap-3 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                        <Mail className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold text-foreground italic break-words">{user.email}</span>
                        </div>
                     </div>
                      <div className="flex items-start gap-3 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                        <Phone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold text-foreground italic break-words">{user.phoneNumber || "N/A"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                        <Home className="w-4 h-4 text-indigo-500 shrink-0 mt-1" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Permanent HQ</span>
                          <span className="text-sm font-bold text-foreground italic break-words whitespace-pre-wrap">{user.permanentAddress || "No address recorded"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                        <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-1" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Temporary Ops Base</span>
                          <span className="text-sm font-bold text-foreground italic break-words whitespace-pre-wrap">{user.temporaryAddress || "No address recorded"}</span>
                        </div>
                      </div>
                  </div>
               </div>

               {volunteer && (
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Operational Skills</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                       {volunteer.skills.map((skill: string) => (
                         <Badge key={skill} variant="outline" className="rounded-xl px-4 py-2 border-indigo-100 bg-card text-indigo-600 font-bold text-xs gap-2">
                            <Tag className="w-3 h-3" /> {skill}
                         </Badge>
                       ))}
                       {volunteer.skills.length === 0 && (
                         <p className="text-xs text-muted-foreground italic">No skills documented yet.</p>
                       )}
                    </div>
                 </div>
               )}

               <div className="pt-4 border-t border-border">
                  <div className={`p-5 rounded-2xl flex items-center justify-between ${volunteer?.isAvailable ? "bg-emerald-50 border border-emerald-100" : "bg-muted border border-border opacity-60"}`}>
                     <div className="flex items-center gap-3">
                        {volunteer?.isAvailable ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-muted-foreground" />}
                        <span className={`text-sm font-black uppercase italic ${volunteer?.isAvailable ? "text-emerald-700" : "text-muted-foreground"}`}>
                           {volunteer?.isAvailable ? "Ready for Dispatch" : "Off-Duty Status"}
                        </span>
                     </div>
                     {volunteer?.isAvailable && (
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

