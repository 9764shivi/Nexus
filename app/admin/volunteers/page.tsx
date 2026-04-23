"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Eye, ShieldCheck, Activity, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VolunteerDetailDialog } from "@/components/volunteer-detail-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";

interface VolunteerToDelete {
  volunteerId: Id<"volunteers">;
  name: string;
  email: string;
}

export default function VolunteersPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const volunteers = useQuery(api.volunteers.getVolunteers, { search: searchQuery } as any);
  const deleteVolunteer = useMutation(api.volunteers.deleteVolunteer);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<VolunteerToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteVolunteer({ volunteerId: toDelete.volunteerId });
      showToast(`${toDelete.name}'s account has been permanently deleted.`, "success");
      setToDelete(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete volunteer.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!volunteers) return (
    <div className="h-[80vh] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-indigo-600 animate-pulse" />
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Enlisting Personnel...</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-black uppercase tracking-widest transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight italic uppercase">Personnel Roster</h1>
          <p className="text-muted-foreground font-medium italic">Comprehensive database of verified humanitarian volunteers.</p>
        </div>
        <Badge className="bg-indigo-50 text-indigo-600 border-none font-black px-4 py-2 rounded-xl h-10 uppercase tracking-widest text-[10px]">
          {volunteers.length} Active Agents
        </Badge>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <Card className="border-none shadow-xl bg-card overflow-hidden rounded-3xl">
        <Table>
          <TableHeader className="bg-muted/50/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="px-8 py-6 w-[350px] font-black uppercase text-[11px] tracking-widest text-muted-foreground">Personnel Identity</TableHead>
              <TableHead className="px-8 py-6 font-black uppercase text-[11px] tracking-widest text-muted-foreground">Tactical Skills</TableHead>
              <TableHead className="px-8 py-6 font-black uppercase text-[11px] tracking-widest text-muted-foreground">Availability</TableHead>
              <TableHead className="px-8 py-6 text-right font-black uppercase text-[11px] tracking-widest text-muted-foreground">Command</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {volunteers.map((volunteer: any) => (
              <TableRow key={volunteer._id} className="group hover:bg-muted/50/50 transition-all border-slate-50">
                {/* Identity */}
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 border-2 border-white shadow-md overflow-hidden ring-4 ring-transparent group-hover:ring-indigo-50 transition-all">
                      {volunteer.imageUrl ? (
                        <img src={volunteer.imageUrl} alt={volunteer.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="italic uppercase">{volunteer.name?.[0]}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-foreground text-lg tracking-tighter italic uppercase">{volunteer.name}</span>
                        {volunteer.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-bold italic">
                        <Mail className="w-3 h-3" />
                        {volunteer.email}
                      </span>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                        Joined: {formatDate(volunteer.joinedAt)}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Skills */}
                <TableCell className="px-8 py-6">
                  <div className="flex flex-wrap gap-2">
                    {volunteer.skills?.length > 0 ? (
                      volunteer.skills.slice(0, 3).map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-card border-border text-muted-foreground rounded-lg px-2 py-0.5">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-300 italic font-medium">Unspecified Skills</span>
                    )}
                    {volunteer.skills?.length > 3 && (
                      <span className="text-[10px] font-black text-slate-300">+{volunteer.skills.length - 3}</span>
                    )}
                  </div>
                </TableCell>

                {/* Availability */}
                 <TableCell className="px-8 py-6">
                   <div className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${volunteer.isAvailable ? (volunteer.assignedReportsCount >= 2 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse') : 'bg-slate-300'}`} />
                     <span className={`text-[10px] font-black uppercase tracking-widest italic ${volunteer.isAvailable ? (volunteer.assignedReportsCount >= 2 ? 'text-amber-600' : 'text-emerald-600') : 'text-muted-foreground'}`}>
                       {volunteer.isAvailable ? (volunteer.assignedReportsCount >= 2 ? 'Busy • Max Capacity' : 'Tactical Standby') : 'Off-Grid'}
                     </span>
                   </div>
                 </TableCell>

                {/* Actions */}
                <TableCell className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl border-2 border-border font-black gap-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-[11px] uppercase tracking-widest active:scale-95 shadow-sm"
                      onClick={() => setSelectedUserId(volunteer.userId)}
                    >
                      <Eye className="w-4 h-4" />
                      Inspect
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-2 border-red-100 font-black gap-2 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[11px] uppercase tracking-widest active:scale-95 shadow-sm"
                      onClick={() =>
                        setToDelete({
                          volunteerId: volunteer._id as Id<"volunteers">,
                          name: volunteer.name,
                          email: volunteer.email,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {volunteers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                   <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-slate-100" />
                      <p className="text-slate-300 font-bold italic">No field personnel registered.</p>
                   </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Inspect Detail Dialog ─────────────────────────── */}
      <VolunteerDetailDialog 
        userId={selectedUserId} 
        isOpen={!!selectedUserId} 
        onOpenChange={(open) => !open && setSelectedUserId(null)} 
      />

      {/* ── Delete Confirmation Dialog ────────────────────── */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && !isDeleting && setToDelete(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
          <DialogHeader className="gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <DialogTitle className="text-center text-xl font-black uppercase tracking-tighter text-foreground">
              Terminate Account?
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium leading-relaxed">
              You are about to permanently delete the account of{" "}
              <span className="font-black text-foreground">{toDelete?.name}</span>{" "}
              (<span className="italic">{toDelete?.email}</span>).
              <br /><br />
              This will <span className="font-black text-red-600">permanently remove</span> their volunteer record, user account, and unassign any active reports. This action{" "}
              <span className="font-black">cannot be undone</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-black uppercase tracking-widest text-[11px] border-2"
              disabled={isDeleting}
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-black uppercase tracking-widest text-[11px] bg-red-600 hover:bg-red-700 text-white gap-2 active:scale-95 transition-all"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

