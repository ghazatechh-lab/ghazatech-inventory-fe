import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const changePwd = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/change-password/", { old_password: e.target.old.value, new_password: e.target.new.value }); toast.success("Password changed"); e.target.reset(); } catch {}
  };
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger><TabsTrigger value="prefs">Preferences</TabsTrigger></TabsList>
        <TabsContent value="profile" className="mt-4">
          <div className="card-surface p-5 space-y-3">
            <div><Label>Full name</Label><Input defaultValue={user?.full_name} className="mt-1.5" /></div>
            <div><Label>Email</Label><Input defaultValue={user?.email} className="mt-1.5" /></div>
            <div><Label>Role</Label><Input defaultValue={user?.role?.name} className="mt-1.5" disabled /></div>
            <div><Label>Branch</Label><Input defaultValue={user?.branch?.branch_name} className="mt-1.5" disabled /></div>
            <Button className="bg-blue-600 hover:bg-blue-700">Save profile</Button>
          </div>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <form onSubmit={changePwd} className="card-surface p-5 space-y-3">
            <div><Label>Current password</Label><Input name="old" type="password" className="mt-1.5" required /></div>
            <div><Label>New password</Label><Input name="new" type="password" className="mt-1.5" required /></div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Change password</Button>
          </form>
        </TabsContent>
        <TabsContent value="prefs" className="mt-4">
          <div className="card-surface p-5 space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-sm text-slate-200">Enable low-stock alerts</div><div className="text-xs text-slate-500">Get notified when items fall below reorder level</div></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><div className="text-sm text-slate-200">Document expiry notifications</div><div className="text-xs text-slate-500">UAE document expiry reminders</div></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><div className="text-sm text-slate-200">Email digest</div><div className="text-xs text-slate-500">Weekly business summary</div></div><Switch /></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
