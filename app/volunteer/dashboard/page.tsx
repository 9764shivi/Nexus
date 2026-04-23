"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AlertCircle, MapPin, CheckCircle2, Navigation, Send, Activity, BarChart3, AlertTriangle, Clock, Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Map = dynamic(() => import("@/components/map-component"), { ssr: false });

export default function VolunteerDashboard() {
  const convexUser = useQuery(api.users.currentUser);
  const volunteers = useQuery(api.volunteers.getVolunteers, {}) as any;
  const reports = useQuery(api.reports.getReports, {}) as any;
  const stats = useQuery(api.users.getVolunteerStats, convexUser ? { userId: convexUser._id } : "skip");
  const requestHelp = useMutation(api.reports.requestHelp);
  
  const [showStats, setShowStats] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const [helpDescription, setHelpDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const volRecord = volunteers?.find((v: any) => v.userId === convexUser?._id);
  const assignedTask = reports?.find((r: any) => r.status === "assigned" && r.assignedVolunteerId === convexUser?._id); 

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

  const handleBroadcast = () => {
    toast.info("Broadcasting availability to nearby Rescue Hubs...");
    setTimeout(() => {
      toast.success("Signal captured by Central Command");
    }, 1500);
  };

  const handleHelpSubmit = async () => {
    if (!assignedTask || !helpDescription.trim()) return;
    setIsSubmitting(true);
    try {
      await requestHelp({ reportId: assignedTask._id, description: helpDescription });
      toast.success("Assistance request dispatched to Super Admin");
      setHelpDialog(false);
      setHelpDescription("");
    } catch (e) {
      toast.error("Failed to send assistance request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight leading-none italic uppercase">Rescue Hub</h1>
          <p className={`font-bold uppercase text-[10px] tracking-widest mt-1 ${volRecord?.isAvailable ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`}>
            {volRecord?.isAvailable ? "Volunteer Active • Ready for Dispatch" : "Off-Duty • Monitoring Signal"}
          </p>
        </div>
        <Button size="icon" className="h-16 w-16 rounded-2xl bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 animate-pulse border-4 border-red-50 group">
          <AlertCircle className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      <div className="space-y-6">
        <h2 className="text-base font-black text-foreground uppercase tracking-tighter italic px-2">Current Mission</h2>
        
        {assignedTask ? (
          <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden group">
            <div className="h-48 overflow-hidden relative">
              <Map 
                center={[assignedTask.location.lat, assignedTask.location.lng]} 
                zoom={14} 
                markers={[{ id: assignedTask._id, position: [assignedTask.location.lat, assignedTask.location.lng], title: assignedTask.title, type: "report" }]} 
                interactive={false}
              />
              <div className="absolute top-4 right-4 z-10">
                <StatusBadge status={assignedTask.status} />
              </div>
            </div>
            <CardContent className="p-8 space-y-4">
              <div>
                <CardTitle className="text-2xl font-black text-foreground group-hover:text-indigo-600 transition-colors uppercase leading-tight italic">{assignedTask.title}</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm mt-1 flex items-center gap-1 italic">
                  <MapPin className="w-3 h-3" />
                  {assignedTask.location.address || "Target Landmark Captured"}
                </CardDescription>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Assigned: {formatDate(assignedTask.assignedAt || assignedTask._creationTime)}
                </p>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{assignedTask.description}</p>
              
              {assignedTask.helpStatus === "provided" && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> Admin Support Provided
                    </p>
                    <p className="text-[9px] font-black text-emerald-400 uppercase italic">{formatDate(assignedTask.helpProvidedAt)}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-900 italic leading-relaxed">
                    {assignedTask.helpResponse}
                  </p>
                </div>
              )}

              {assignedTask.helpStatus === "requested" && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-2 animate-pulse">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Help Request Pending
                    </p>
                    <p className="text-[9px] font-black text-amber-400 uppercase italic">{formatDate(assignedTask.helpRequestedAt)}</p>
                  </div>
                  <p className="text-xs font-medium text-amber-800 italic">
                    " {assignedTask.helpRequest} "
                  </p>
                </div>
              )}
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${assignedTask.location.lat},${assignedTask.location.lng}`, '_blank')}
                  className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black gap-2 text-sm uppercase shadow-lg shadow-indigo-100"
                >
                  <Navigation className="w-4 h-4" />
                  START NAV
                </Button>
                <Link href={`/volunteer/resolve/${assignedTask._id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-2 border-border hover:border-indigo-200 hover:bg-indigo-50 font-black gap-2 text-sm uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    RESOLVE
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className={`flex-1 h-14 rounded-2xl border-2 font-black gap-2 text-sm uppercase ${
                    assignedTask.helpStatus === "requested" ? "bg-amber-50 border-amber-200 text-amber-600" : "border-border hover:border-amber-200 hover:bg-amber-50"
                  }`}
                  onClick={() => setHelpDialog(true)}
                  disabled={assignedTask.helpStatus === "requested"}
                >
                  <AlertTriangle className={`w-4 h-4 ${assignedTask.helpStatus === "requested" ? "text-amber-500" : "text-amber-500"}`} />
                  {assignedTask.helpStatus === "requested" ? "PENDING" : "NEED HELP"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border-4 border-dashed border-border bg-card py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center group">
              <Activity className={`w-8 h-8 ${volRecord?.isAvailable ? "text-emerald-400" : "text-slate-200"} group-hover:text-indigo-400 transition-colors`} />
            </div>
            <div>
              <p className="text-base font-black text-foreground uppercase tracking-tighter italic">Status: {volRecord?.isAvailable ? "Ready" : "Standby"}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {volRecord?.isAvailable ? "Watching for new dispatch calls..." : "Go on-duty in profile to receive alerts"}
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={handleBroadcast}
          variant="outline" 
          className="h-32 rounded-2xl border-none shadow-xl bg-card flex flex-col items-center justify-center text-center group hover:bg-muted/50 transition-all font-black text-foreground uppercase tracking-tighter hover:ring-2 hover:ring-indigo-500/50"
        >
          <Send className="w-8 h-8 text-indigo-400 mb-2 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          Broadcast
        </Button>
        <Button 
          onClick={() => setShowStats(true)}
          variant="outline" 
          className="h-32 rounded-2xl border-none shadow-xl bg-card flex flex-col items-center justify-center text-center group hover:bg-muted/50 transition-all font-black text-foreground uppercase tracking-tighter hover:ring-2 hover:ring-emerald-500/50"
        >
          <BarChart3 className="w-8 h-8 text-emerald-400 mb-2 group-hover:text-emerald-600 group-hover:scale-110 transition-transform" />
          My Stats
        </Button>
      </div>

      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-8 max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-foreground">Mission Intel</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Impact Report</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 pt-4">
            <div className="bg-muted/50 p-6 rounded-3xl text-center space-y-1">
              <p className="text-4xl font-black text-indigo-600 italic leading-none">{stats?.totalAssigned || 0}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Missions</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-3xl text-center space-y-0.5 border border-emerald-100">
                <p className="text-xl font-black text-emerald-600 italic leading-none">{stats?.completed || 0}</p>
                <p className="text-[9px] font-bold uppercase text-emerald-400 tracking-tighter">Resolved</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-3xl text-center space-y-0.5 border border-indigo-100">
                <p className="text-xl font-black text-indigo-600 italic leading-none">{stats?.active || 0}</p>
                <p className="text-[9px] font-bold uppercase text-indigo-400 tracking-tighter">Active</p>
              </div>
            </div>
            <Button onClick={() => setShowStats(false)} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black uppercase italic tracking-widest">Close Intel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Need Help Modal */}
      <Dialog open={helpDialog} onOpenChange={setHelpDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Request Assistance</DialogTitle>
            <DialogDescription>Submit a help request for the current mission.</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 p-8 relative">
            <button 
              onClick={() => setHelpDialog(false)}
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
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest" onClick={() => setHelpDialog(false)}>
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

