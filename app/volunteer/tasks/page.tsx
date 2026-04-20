"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  FileSearch,
  History
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function VolunteerTasksPage() {
  const user = useQuery(api.users.currentUser);
  const tasks = useQuery(api.reports.getReports, user ? { assignedVolunteerId: user._id } : "skip");
  const resolveTask = useMutation(api.reports.resolveReport);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (taskId: any) => {
    setResolvingId(taskId);
    try {
      await resolveTask({ reportId: taskId });
      toast.success("Task marked as resolved!");
    } catch (e) {
      toast.error("Failed to resolve task");
    } finally {
      setResolvingId(null);
    }
  };

  if (!user || !tasks) return <div className="p-8 text-center font-bold text-muted-foreground">Syncing with Nexus...</div>;

  const reports = Array.isArray(tasks) ? tasks : (tasks as any)?.page || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight italic uppercase">My Rescue Missions</h1>
        <p className="text-muted-foreground font-medium italic">Active reports currently assigned to you for resolution.</p>
      </div>

      <div className="grid gap-6">
        {reports.filter((t: any) => t.status !== "resolved").map((task: any) => (
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
                      {task.title || "Untitiled Incident"}
                    </CardTitle>
                    <p className="text-muted-foreground font-medium line-clamp-2 italic">{task.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Location</p>
                      <p className="text-sm font-bold text-slate-700">{task.location.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reported At</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(task._creationTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-48 p-6 flex flex-col justify-center gap-3 bg-muted/50/50">
                <Button 
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                  onClick={() => handleResolve(task._id)}
                  disabled={resolvingId === task._id}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {resolvingId === task._id ? "..." : "RESOLVE"}
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl border-border font-bold gap-2 text-muted-foreground hover:bg-card hover:text-indigo-600 transition-all">
                  <Navigation className="w-4 h-4" />
                  MAP
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {reports.filter((t: any) => t.status !== "resolved").length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="flex justify-center flex-col items-center opacity-20">
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-2" />
              <h3 className="text-2xl font-black text-foreground uppercase italic">All Clear</h3>
            </div>
            <p className="text-muted-foreground font-medium">No active tasks assigned to you. Take some rest!</p>
          </div>
        )}
      </div>

      <div className="pt-12 border-t border-border">
         <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-black text-foreground uppercase italic">Resolution History</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.filter((t: any) => t.status === "resolved").map((task: any) => (
              <Card key={task._id} className="rounded-3xl border-none shadow-md bg-card p-6 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <Badge variant="outline" className="bg-emerald-50 border-emerald-100 text-emerald-600 font-black uppercase text-[9px]">Resolved</Badge>
                   <span className="text-[10px] font-bold text-slate-300">{new Date(task._creationTime).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-slate-700 mb-1">{task.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 italic">{task.description}</p>
              </Card>
            ))}
         </div>
      </div>
    </div>
  );
}

