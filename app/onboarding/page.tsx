"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Role } from "@/hooks/use-role";

import { updateUserRole } from "@/app/actions/user";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [role, setRole] = useState<Role>("volunteer");
  const [loading, setLoading] = useState(false);
  const syncUser = useMutation(api.users.syncUser);

  if (!isLoaded) return null;

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Update Clerk Metadata (via Server Action)
      await updateUserRole(user.id, role);

      // 2. Sync with Convex
      await syncUser({
        name: user.fullName || user.username || "Anonymous",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl,
        role,
      });

      // 3. Redirect
      const roleRedirects: Record<string, string> = {
        super_admin: "/admin/dashboard",
        field_worker: "/worker/dashboard",
        volunteer: "/volunteer/dashboard",
      };
      
      router.push(roleRedirects[role]);
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to Nexus</CardTitle>
          <CardDescription>Select your role to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Role</Label>
            <Select onValueChange={(value) => setRole(value as Role)} defaultValue="volunteer">
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="field_worker">Field Worker</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleComplete} disabled={loading}>
            {loading ? "Saving..." : "Get Started"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

