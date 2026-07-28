import React from "react";
import {
  Bell,
  Building2,
  Check,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Save,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import api, { getApiErrorDetails } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PREFERENCE_STORAGE_KEY = "ghazatech_user_preferences";

const defaultPreferences = {
  low_stock_alerts: true,
  document_expiry_notifications: true,
  email_digest: false,
};

const readStoredPreferences = () => {
  try {
    const value = localStorage.getItem(PREFERENCE_STORAGE_KEY);

    if (!value) {
      return defaultPreferences;
    }

    return {
      ...defaultPreferences,
      ...JSON.parse(value),
    };
  } catch {
    return defaultPreferences;
  }
};

const getRoleName = (user) =>
  user?.role?.name || user?.role_detail?.name || user?.role_name || "—";

const getRoleCode = (user) =>
  user?.role?.code || user?.role_detail?.code || user?.role_code || "—";

const getBranchName = (user) =>
  user?.branch?.branch_name ||
  user?.branch_detail?.branch_name ||
  user?.branch_name ||
  "All branches";

const getEmployeeCode = (user) =>
  user?.employee_code ||
  user?.employee_detail?.employee_code ||
  user?.employee?.employee_code ||
  "Not linked";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [passwordForm, setPasswordForm] = React.useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [preferences, setPreferences] = React.useState(readStoredPreferences);

  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const [preferencesSaving, setPreferencesSaving] = React.useState(false);

  const administrator = isAdmin(user);

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New password and confirmation do not match.");

      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error("New password must contain at least 8 characters.");

      return;
    }

    setPasswordLoading(true);

    try {
      await api.post(
        "/auth/change-password/",
        {
          old_password: passwordForm.old_password,

          new_password: passwordForm.new_password,
        },
        {
          skipGlobalErrorToast: true,
        },
      );

      toast.success("Password changed successfully.");

      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      const details = getApiErrorDetails(error);

      toast.error(details.title || "Unable to change password", {
        description:
          details.summary ||
          details.message ||
          "Check your current password and try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const savePreferences = async () => {
    setPreferencesSaving(true);

    try {
      localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));

      toast.success("Preferences saved.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const togglePreference = (field, checked) => {
    setPreferences((current) => ({
      ...current,
      [field]: checked,
    }));
  };

  const reloadProfile = async () => {
    try {
      await refreshUser?.();

      toast.success("Profile information refreshed.");
    } catch {
      toast.error("Unable to refresh profile information.");
    }
  };

  const preferenceItems = [
    {
      key: "low_stock_alerts",
      title: "Enable low-stock alerts",
      description:
        "Receive alerts when product quantity falls below its reorder level.",
    },
    {
      key: "document_expiry_notifications",
      title: "Document expiry notifications",
      description:
        "Receive reminders for employee passport, Emirates ID, visa, and contract expiry.",
    },
    {
      key: "email_digest",
      title: "Email digest",
      description:
        "Receive a weekly summary of business activities and pending actions.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, security, preferences, users, roles, and permissions"
      />

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="profile" className="gap-2">
            <Users className="h-4 w-4" />
            Profile
          </TabsTrigger>

          <TabsTrigger value="security" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Security
          </TabsTrigger>

          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>

          {administrator && (
            <TabsTrigger value="administration" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Administration
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="card-surface p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Account Information</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Information associated with your current account.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Full Name</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={user?.full_name || ""}
                    readOnly
                  />
                </div>

                <div>
                  <Label>Username</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={user?.username || ""}
                    readOnly
                  />
                </div>

                <div>
                  <Label>Email</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={user?.email || ""}
                    readOnly
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={user?.phone_number || user?.phone || ""}
                    readOnly
                  />
                </div>

                <div>
                  <Label>Role</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={`${getRoleName(user)} (${getRoleCode(user)})`}
                    readOnly
                  />
                </div>

                <div>
                  <Label>Employee Code</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={getEmployeeCode(user)}
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Assigned Branch</Label>

                  <Input
                    className="mt-2 bg-muted"
                    value={getBranchName(user)}
                    readOnly
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button type="button" variant="outline" onClick={reloadProfile}>
                  Refresh Profile
                </Button>
              </div>
            </section>

            <aside className="card-surface p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h2 className="mt-4 font-semibold">Account Access</h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your role controls which modules, pages, and operations are
                available.
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground">Role</span>

                  <strong>{getRoleName(user)}</strong>
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground">Branch</span>

                  <strong className="max-w-[170px] truncate">
                    {getBranchName(user)}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground">Account</span>

                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                    <Check className="h-4 w-4" />
                    Active
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <form
              onSubmit={changePassword}
              className="card-surface space-y-4 p-5"
            >
              <div>
                <h2 className="text-lg font-semibold">Change Password</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Use a strong password that is not used for another account.
                </p>
              </div>

              <div>
                <Label>Current Password</Label>

                <Input
                  type="password"
                  autoComplete="current-password"
                  className="mt-2"
                  value={passwordForm.old_password}
                  onChange={(event) =>
                    updatePasswordField("old_password", event.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label>New Password</Label>

                <Input
                  type="password"
                  autoComplete="new-password"
                  className="mt-2"
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    updatePasswordField("new_password", event.target.value)
                  }
                  minLength={8}
                  required
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  Use at least 8 characters.
                </p>
              </div>

              <div>
                <Label>Confirm New Password</Label>

                <Input
                  type="password"
                  autoComplete="new-password"
                  className="mt-2"
                  value={passwordForm.confirm_password}
                  onChange={(event) =>
                    updatePasswordField("confirm_password", event.target.value)
                  }
                  minLength={8}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={passwordLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />

                {passwordLoading ? "Changing..." : "Change Password"}
              </Button>
            </form>

            <aside className="card-surface p-5">
              <KeyRound className="h-7 w-7 text-amber-500" />

              <h2 className="mt-4 font-semibold">Password Security</h2>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Do not share your password with other employees.</p>

                <p>
                  Avoid using employee codes, phone numbers, or company names as
                  passwords.
                </p>

                <p>
                  Sign out when accessing the application from a shared device.
                </p>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <section className="card-surface max-w-4xl p-5">
            <div>
              <h2 className="text-lg font-semibold">
                Notification Preferences
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose the alerts and summaries you want to receive.
              </p>
            </div>

            <div className="mt-5 divide-y rounded-xl border">
              {preferenceItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-5 p-4"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>

                  <Switch
                    checked={Boolean(preferences[item.key])}
                    onCheckedChange={(checked) =>
                      togglePreference(item.key, checked)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                disabled={preferencesSaving}
                onClick={savePreferences}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />

                {preferencesSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </section>
        </TabsContent>

        {administrator && (
          <TabsContent value="administration" className="mt-0">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Link
                to="/settings/users-roles"
                className="card-surface group p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:hover:border-blue-500/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <UserCog className="h-6 w-6" />
                </div>

                <h2 className="mt-4 font-semibold">
                  Users, Roles & Permissions
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Create users, link employee codes, manage roles, and select
                  operation permissions.
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-300">
                  Open Management
                  <ExternalLink className="h-4 w-4" />
                </span>
              </Link>

              <Link
                to="/branches"
                className="card-surface group p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-500/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Building2 className="h-6 w-6" />
                </div>

                <h2 className="mt-4 font-semibold">Branch Management</h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Create branches, assign branch managers, and manage
                  operational locations.
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                  Manage Branches
                  <ExternalLink className="h-4 w-4" />
                </span>
              </Link>

              <Link
                to="/audit-logs"
                className="card-surface group p-5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg dark:hover:border-violet-500/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <h2 className="mt-4 font-semibold">Audit Logs</h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review important user activities, API operations, and system
                  changes.
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-300">
                  View Audit Logs
                  <ExternalLink className="h-4 w-4" />
                </span>
              </Link>

              <a
                href="https://www.ghazatech.com/"
                target="_blank"
                rel="noreferrer"
                className="card-surface group p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:hover:border-cyan-500/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
                  <Settings className="h-6 w-6" />
                </div>

                <h2 className="mt-4 font-semibold">Ghazatech Website</h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Open the official Ghazatech website in a new browser tab.
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 dark:text-cyan-300">
                  Open Website
                  <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
