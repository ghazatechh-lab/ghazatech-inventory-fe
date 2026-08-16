import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Edit,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSION_GROUPS } from "@/config/permissionGroups";
import { describeRoleAccess } from "./role_description";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const PERMISSION_CODE_ALIASES = {
  "branches.branches.view_all": "branches.view_all",
  "branches.branch_access.view_all": "branches.view_all",
};

const canonicalPermissionCode = (code) => {
  const normalized = String(code || "").trim();
  return PERMISSION_CODE_ALIASES[normalized] || normalized;
};

const buildCatalogPermissionCode = (group, resource, action) => {
  const prefix =
    resource?.code_prefix || `${group?.module}.${resource?.resource}`;

  return canonicalPermissionCode(`${prefix}.${action}`);
};

const normalizePermissions = (value) => {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value.flatMap((item) => {
          if (typeof item === "string") {
            const code = canonicalPermissionCode(item);
            return code ? [code] : [];
          }

          if (item && typeof item === "object") {
            const code =
              item.code || item.permission_code || item.permission || item.name;

            const normalizedCode = canonicalPermissionCode(code);

            return normalizedCode ? [normalizedCode] : [];
          }

          return [];
        }),
      ),
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      return normalizePermissions(JSON.parse(trimmed));
    } catch {
      return Array.from(
        new Set(
          trimmed
            .split(",")
            .map((item) => canonicalPermissionCode(item))
            .filter(Boolean),
        ),
      );
    }
  }

  if (typeof value === "object") {
    if ("permissions" in value) {
      return normalizePermissions(value.permissions);
    }

    if ("results" in value) {
      return normalizePermissions(value.results);
    }

    if ("data" in value) {
      return normalizePermissions(value.data);
    }

    const codes = [];

    const visit = (node, path = []) => {
      if (node === true) {
        if (path.length) {
          codes.push(canonicalPermissionCode(path.join(".")));
        }

        return;
      }

      if (node === false || node === null || node === undefined) {
        return;
      }

      if (Array.isArray(node)) {
        node.forEach((item) => {
          if (typeof item === "string" && item.trim()) {
            codes.push(canonicalPermissionCode(item));
          } else if (item && typeof item === "object") {
            const code =
              item.code || item.permission_code || item.permission || item.name;

            if (typeof code === "string" && code.trim()) {
              codes.push(canonicalPermissionCode(code));
            }
          }
        });

        return;
      }

      if (typeof node === "object") {
        Object.entries(node).forEach(([key, child]) => {
          visit(child, [...path, key]);
        });
      }
    };

    visit(value);

    return Array.from(new Set(codes));
  }

  return [];
};

const normalizeCatalog = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.modules)) {
    return value.modules;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.modules)) {
    return value.data.modules;
  }

  return [];
};

const emptyUser = {
  email: "",
  username: "",
  password: "",
  full_name: "",
  phone_number: "",
  role: "",
  employee: "",
  branch: "",
  is_active: true,
};

const emptyRole = {
  name: "",
  code: "",
  description: "",
  permissions: [],
  is_active: true,
};

const ACCESS_PROFILES = {
  BRANCH_SWITCH: {
    label: "Change Active Branch",
    description:
      "Allows the role to change the active working branch from the application header.",
    permissions: ["branches.switch"],
  },

  VIEW_ALL_BRANCHES: {
    label: "View All Branches",
    description:
      "Allows the role to switch branches and use the All Branches option.",
    permissions: ["branches.switch", "branches.view_all"],
  },

  PRICE_OVERRIDE: {
    label: "Discount & Price Override",
    description:
      "Allows selected roles to apply sales discounts and override default selling prices.",
    permissions: ["sales.selling.discount", "sales.selling.price_override"],
  },
};

const OBSOLETE_TRANSACTION_VAT_PERMISSIONS = new Set([
  "sales.selling.vat",
  "sales.selling.non_vat",
  "purchases.stock_purchase.vat",
  "purchases.stock_purchase.non_vat",
]);

const isObsoleteTransactionVatPermission = (code) =>
  OBSOLETE_TRANSACTION_VAT_PERMISSIONS.has(code) ||
  code.startsWith("sales.vat.") ||
  code.startsWith("sales.non_vat.") ||
  code.startsWith("purchases.vat.") ||
  code.startsWith("purchases.non_vat.");

const cleanPermissionCodes = (value) =>
  Array.from(
    new Set(
      normalizePermissions(value)
        .map(canonicalPermissionCode)
        .filter((code) => !isObsoleteTransactionVatPermission(code)),
    ),
  );

export default function UserRoleManagementPage() {
  const queryClient = useQueryClient();

  const [userOpen, setUserOpen] = React.useState(false);
  const [roleOpen, setRoleOpen] = React.useState(false);

  const [userForm, setUserForm] = React.useState(emptyUser);
  const [roleForm, setRoleForm] = React.useState(emptyRole);

  const [editingUser, setEditingUser] = React.useState(null);
  const [editingRole, setEditingRole] = React.useState(null);

  const [permissionTab, setPermissionTab] = React.useState("special");

  const [permissionSearch, setPermissionSearch] = React.useState("");

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkProfile, setBulkProfile] = React.useState("BRANCH_SWITCH");
  const [bulkRoleIds, setBulkRoleIds] = React.useState([]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      unwrap(
        await api.get("/auth/users/", {
          params: {
            page_size: 500,
          },
        }),
      ),
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () =>
      unwrap(
        await api.get("/auth/roles/", {
          params: {
            page_size: 500,
          },
        }),
      ),
  });

  const { data: catalogData } = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: async () =>
      unwrap(await api.get("/auth/roles/permission-catalog/")),
  });

  const { data: optionsData } = useQuery({
    queryKey: ["user-form-options", editingUser?.employee],
    queryFn: async () =>
      unwrap(
        await api.get("/auth/users/form-options/", {
          params: editingUser?.employee
            ? {
                include_employee: editingUser.employee,
              }
            : {},
        }),
      ),
  });

  const users = React.useMemo(() => normalizeList(usersData), [usersData]);

  const roles = React.useMemo(() => normalizeList(rolesData), [rolesData]);

  const catalog = React.useMemo(
    () => normalizeCatalog(catalogData),
    [catalogData],
  );

  const employees = React.useMemo(
    () => normalizeList(optionsData?.employees),
    [optionsData],
  );

  const branches = React.useMemo(
    () => normalizeList(optionsData?.branches),
    [optionsData],
  );

  const rolePermissions = React.useMemo(
    () => cleanPermissionCodes(roleForm.permissions),
    [roleForm.permissions],
  );

  const catalogPermissionCodes = React.useMemo(() => {
    const codes = new Set();

    catalog.forEach((group) => {
      (group.resources || []).forEach((resource) => {
        (resource.actions || []).forEach((action) => {
          codes.add(buildCatalogPermissionCode(group, resource, action));
        });
      });
    });

    return codes;
  }, [catalog]);

  const specialPermissionGroups = React.useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) => {
          const search = permissionSearch.trim().toLowerCase();

          if (!search) {
            return true;
          }

          return [permission.label, permission.code, permission.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        }),
      })).filter((group) => group.permissions.length),
    [permissionSearch],
  );

  const filteredCatalog = React.useMemo(
    () =>
      catalog
        .map((group) => ({
          ...group,
          resources: (group.resources || [])
            .map((resource) => ({
              ...resource,
              actions: (resource.actions || []).filter((action) => {
                const code = buildCatalogPermissionCode(
                  group,
                  resource,
                  action,
                );

                if (isObsoleteTransactionVatPermission(code)) {
                  return false;
                }

                const search = permissionSearch.trim().toLowerCase();

                if (!search) {
                  return true;
                }

                return [
                  group.label,
                  group.module,
                  resource.label,
                  resource.resource,
                  action,
                  code,
                ]
                  .filter(Boolean)
                  .some((value) =>
                    String(value).toLowerCase().includes(search),
                  );
              }),
            }))
            .filter((resource) => resource.actions.length),
        }))
        .filter((group) => group.resources.length),
    [catalog, permissionSearch],
  );

  const specialPermissionCodes = React.useMemo(
    () =>
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.code),
      ),
    [],
  );

  const selectedSpecialCount = specialPermissionCodes.filter((code) =>
    rolePermissions.includes(code),
  ).length;

  const selectedRole = roles.find(
    (role) => String(role.id) === String(userForm.role),
  );

  const employeeRequired =
    selectedRole && String(selectedRole.code || "").toUpperCase() !== "ADMIN";

  const showError = (error, fallbackTitle) => {
    const details = getApiErrorDetails(error);

    toast.error(details.title || fallbackTitle, {
      description: details.summary || details.message,
    });
  };

  const userMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...userForm,
        role: userForm.role || null,
        employee: employeeRequired ? userForm.employee || null : null,
        branch: userForm.branch || null,
      };

      if (editingUser && !payload.password) {
        delete payload.password;
      }

      return editingUser
        ? api.patch(`/auth/users/${editingUser.id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/auth/users/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-users"],
      });

      toast.success(editingUser ? "User updated" : "User created");

      setUserOpen(false);
      setEditingUser(null);
      setUserForm(emptyUser);
    },

    onError: (error) => showError(error, "Unable to save user"),
  });

  const roleMutation = useMutation({
    mutationFn: () => {
      const permissions = cleanPermissionCodes(roleForm.permissions);

      const payload = {
        ...roleForm,
        permissions,
      };

      return editingRole
        ? api.patch(`/auth/roles/${editingRole.id}/`, payload, {
            skipGlobalErrorToast: true,
          })
        : api.post("/auth/roles/", payload, {
            skipGlobalErrorToast: true,
          });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-roles"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-users"],
        }),
      ]);

      toast.success(editingRole ? "Role updated" : "Role created");

      setRoleOpen(false);
      setEditingRole(null);
      setRoleForm(emptyRole);
    },

    onError: (error) => showError(error, "Unable to save role"),
  });

  const bulkPermissionMutation = useMutation({
    mutationFn: async () => {
      const profile = ACCESS_PROFILES[bulkProfile];

      if (!profile) {
        throw new Error("Invalid permission profile.");
      }

      const selectedRoles = roles.filter((role) =>
        bulkRoleIds.includes(String(role.id)),
      );

      await Promise.all(
        selectedRoles.map((role) => {
          const currentPermissions = cleanPermissionCodes(role.permissions);

          const permissions = Array.from(
            new Set([...currentPermissions, ...profile.permissions]),
          );

          return api.patch(
            `/auth/roles/${role.id}/`,
            {
              permissions,
            },
            {
              skipGlobalErrorToast: true,
            },
          );
        }),
      );
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-roles"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-users"],
        }),
      ]);

      toast.success(
        `${ACCESS_PROFILES[bulkProfile].label} assigned to ${
          bulkRoleIds.length
        } role(s).`,
      );

      setBulkOpen(false);
      setBulkRoleIds([]);
    },

    onError: (error) =>
      showError(error, "Unable to assign permissions to selected roles"),
  });

  const openUser = (user = null) => {
    setEditingUser(user);

    setUserForm(
      user
        ? {
            email: user.email || "",
            username: user.username || "",
            password: "",
            full_name: user.full_name || "",
            phone_number: user.phone_number || "",
            role: user.role ? String(user.role) : "",
            employee: user.employee ? String(user.employee) : "",
            branch: user.branch ? String(user.branch) : "",
            is_active: Boolean(user.is_active),
          }
        : emptyUser,
    );

    setUserOpen(true);
  };

  const openRole = (role = null) => {
    setEditingRole(role);
    setPermissionTab("special");
    setPermissionSearch("");

    setRoleForm(
      role
        ? {
            name: role.name || "",
            code: role.code || "",
            description: role.description || "",
            permissions: cleanPermissionCodes(role.permissions),
            is_active:
              role.is_active === undefined ? true : Boolean(role.is_active),
          }
        : emptyRole,
    );

    setRoleOpen(true);
  };

  const togglePermission = (code) => {
    const normalizedCode = canonicalPermissionCode(code);

    setRoleForm((current) => {
      const currentPermissions = cleanPermissionCodes(current.permissions);

      return {
        ...current,
        permissions: currentPermissions.includes(normalizedCode)
          ? currentPermissions.filter(
              (permission) => permission !== normalizedCode,
            )
          : Array.from(new Set([...currentPermissions, normalizedCode])),
      };
    });
  };

  const toggleResource = (group, resource, actions) => {
    const permissionCodes = actions
      .map((action) => buildCatalogPermissionCode(group, resource, action))
      .filter((code) => !isObsoleteTransactionVatPermission(code));

    setRoleForm((current) => {
      const currentPermissions = cleanPermissionCodes(current.permissions);

      const allSelected = permissionCodes.every((code) =>
        currentPermissions.includes(code),
      );

      return {
        ...current,
        permissions: allSelected
          ? currentPermissions.filter((code) => !permissionCodes.includes(code))
          : Array.from(new Set([...currentPermissions, ...permissionCodes])),
      };
    });
  };

  const togglePermissionCodes = (codes) => {
    const normalizedCodes = codes
      .map(canonicalPermissionCode)
      .filter((code) => !isObsoleteTransactionVatPermission(code));

    setRoleForm((current) => {
      const currentPermissions = cleanPermissionCodes(current.permissions);

      const allSelected = normalizedCodes.every((code) =>
        currentPermissions.includes(code),
      );

      return {
        ...current,
        permissions: allSelected
          ? currentPermissions.filter((code) => !normalizedCodes.includes(code))
          : Array.from(new Set([...currentPermissions, ...normalizedCodes])),
      };
    });
  };

  const actionUser = async (user, action) => {
    try {
      await api.post(`/auth/users/${user.id}/${action}/`);

      await queryClient.invalidateQueries({
        queryKey: ["admin-users"],
      });

      toast.success(
        action === "activate" ? "User activated" : "User deactivated",
      );
    } catch (error) {
      showError(error, "Unable to update user");
    }
  };

  const remove = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) {
      return;
    }

    try {
      await api.delete(`/auth/${type}s/${id}/`);

      await queryClient.invalidateQueries({
        queryKey: [`admin-${type}s`],
      });

      toast.success(`${type} deleted`);
    } catch (error) {
      showError(error, `Unable to delete ${type}`);
    }
  };

  return (
    <div className="settings-module-page settings-workspace space-y-5">
      <PageHeader
        title="Users, Roles & Permissions"
        subtitle="Control employee accounts and operation-level access"
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>

          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openUser()}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          <div className="card-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-4">User</th>
                  <th>Employee Code</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th className="pr-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {usersLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="p-4">
                        <strong>{user.full_name || user.username}</strong>

                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </td>

                      <td>{user.employee_code || "Admin account"}</td>

                      <td>{user.role_name || "—"}</td>

                      <td>
                        {user.branch_detail?.branch_name ||
                          user.branch_name ||
                          "All branches"}
                      </td>

                      <td>
                        {user.is_active ? (
                          <span className="text-emerald-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </td>

                      <td className="pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              actionUser(
                                user,
                                user.is_active ? "deactivate" : "activate",
                              )
                            }
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => remove("user", user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBulkProfile("BRANCH_SWITCH");
                setBulkRoleIds([]);
                setBulkOpen(true);
              }}
            >
              <Layers3 className="mr-2 h-4 w-4" />
              Assign Access to Roles
            </Button>

            <Button onClick={() => openRole()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rolesLoading ? (
              <div className="card-surface p-5 text-muted-foreground">
                Loading roles...
              </div>
            ) : (
              roles.map((role) => {
                const permissions = cleanPermissionCodes(role.permissions);

                return (
                  <div key={role.id} className="card-surface p-5">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{role.name}</h3>

                        <p className="text-xs text-muted-foreground">
                          {role.code} · {role.user_count || 0} users
                        </p>
                      </div>

                      <ShieldCheck className="h-5 w-5 text-blue-500" />
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {role.description || "No description"}
                    </p>

                    <div className="mt-3 rounded-xl border bg-muted/25 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        What this role can do
                      </p>

                      <p className="mt-1 text-sm leading-5">
                        {describeRoleAccess({
                          ...role,
                          permissions,
                        })}
                      </p>
                    </div>

                    <p className="mt-3 text-xs">
                      {permissions.length} permissions
                    </p>

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openRole(role)}
                      >
                        Edit
                      </Button>

                      {role.code !== "ADMIN" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => remove("role", role.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {bulkOpen && (
        <BulkAccessModal
          roles={roles}
          bulkProfile={bulkProfile}
          setBulkProfile={setBulkProfile}
          bulkRoleIds={bulkRoleIds}
          setBulkRoleIds={setBulkRoleIds}
          pending={bulkPermissionMutation.isPending}
          onClose={() => setBulkOpen(false)}
          onSave={() => bulkPermissionMutation.mutate()}
        />
      )}

      {userOpen && (
        <UserModal
          editingUser={editingUser}
          userForm={userForm}
          setUserForm={setUserForm}
          roles={roles}
          employees={employees}
          branches={branches}
          employeeRequired={employeeRequired}
          pending={userMutation.isPending}
          onClose={() => setUserOpen(false)}
          onSave={() => userMutation.mutate()}
        />
      )}

      {roleOpen && (
        <RoleModal
          editingRole={editingRole}
          roleForm={roleForm}
          setRoleForm={setRoleForm}
          permissionTab={permissionTab}
          setPermissionTab={setPermissionTab}
          permissionSearch={permissionSearch}
          setPermissionSearch={setPermissionSearch}
          specialPermissionGroups={specialPermissionGroups}
          filteredCatalog={filteredCatalog}
          rolePermissions={rolePermissions}
          selectedSpecialCount={selectedSpecialCount}
          catalogPermissionCodes={catalogPermissionCodes}
          togglePermission={togglePermission}
          toggleResource={toggleResource}
          togglePermissionCodes={togglePermissionCodes}
          pending={roleMutation.isPending}
          onClose={() => setRoleOpen(false)}
          onSave={() => roleMutation.mutate()}
        />
      )}
    </div>
  );
}

function BulkAccessModal({
  roles,
  bulkProfile,
  setBulkProfile,
  bulkRoleIds,
  setBulkRoleIds,
  pending,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">
              Assign Access to Multiple Roles
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose one access profile and assign it to several roles at once.
            </p>
          </div>

          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <Label>Access Profile</Label>

            <Select value={bulkProfile} onValueChange={setBulkProfile}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {Object.entries(ACCESS_PROFILES).map(([key, profile]) => (
                  <SelectItem key={key} value={key}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {ACCESS_PROFILES[bulkProfile].label}
              </p>

              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {ACCESS_PROFILES[bulkProfile].description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {ACCESS_PROFILES[bulkProfile].permissions.map((permission) => (
                  <code
                    key={permission}
                    className="rounded bg-background px-2 py-1 text-[10px]"
                  >
                    {permission}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Select Roles</Label>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setBulkRoleIds(
                    roles
                      .filter(
                        (role) =>
                          String(role.code || "").toUpperCase() !== "ADMIN",
                      )
                      .map((role) => String(role.id)),
                  )
                }
              >
                Select all non-admin roles
              </Button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {roles
                .filter(
                  (role) => String(role.code || "").toUpperCase() !== "ADMIN",
                )
                .map((role) => {
                  const checked = bulkRoleIds.includes(String(role.id));

                  return (
                    <label
                      key={role.id}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        checked
                          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/20"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={(event) =>
                            setBulkRoleIds((current) =>
                              event.target.checked
                                ? [...current, String(role.id)]
                                : current.filter(
                                    (id) => id !== String(role.id),
                                  ),
                            )
                          }
                        />

                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {role.code}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {describeRoleAccess(role)}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t p-5">
          <p className="text-sm text-muted-foreground">
            {bulkRoleIds.length} role(s) selected
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="button"
              disabled={!bulkRoleIds.length || pending}
              onClick={onSave}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Assign Access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserModal({
  editingUser,
  userForm,
  setUserForm,
  roles,
  employees,
  branches,
  employeeRequired,
  pending,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">
              {editingUser ? "Edit User" : "Create User"}
            </h2>

            <p className="text-sm text-muted-foreground">
              Non-admin users must be linked to an employee code.
            </p>
          </div>

          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {[
            ["Full Name", "full_name"],
            ["Email", "email"],
            ["Username", "username"],
            [editingUser ? "New Password (optional)" : "Password", "password"],
            ["Phone", "phone_number"],
          ].map(([label, key]) => (
            <div key={key}>
              <Label>{label}</Label>

              <Input
                type={key === "password" ? "password" : "text"}
                value={userForm[key]}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="mt-2"
                required={
                  ["email", "username"].includes(key) ||
                  (!editingUser && key === "password")
                }
              />
            </div>
          ))}

          <div>
            <Label>Role *</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3"
              value={userForm.role}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  role: event.target.value,
                  employee: "",
                }))
              }
              required
            >
              <option value="">Select role</option>

              {roles
                .filter((role) => role.is_active !== false)
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
            </select>
          </div>

          {employeeRequired && (
            <div>
              <Label>Employee *</Label>

              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                value={userForm.employee}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    employee: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select employee</option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name ||
                      employee.name ||
                      employee.employee_name}{" "}
                    {employee.employee_code
                      ? `· ${employee.employee_code}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Assigned Branch</Label>

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3"
              value={userForm.branch}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  branch: event.target.value,
                }))
              }
            >
              <option value="">No branch / all branches</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name || branch.name || branch.branch_code}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-muted-foreground">
              This is the user's default branch. Give the role{" "}
              <code>branches.switch</code> to allow changing branch from the
              header.
            </p>
          </div>

          <label className="md:col-span-2 flex items-center gap-3 rounded-xl border p-4">
            <input
              type="checkbox"
              checked={userForm.is_active}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />

            <div>
              <p className="font-medium">Active User</p>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot sign in.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving..."
              : editingUser
                ? "Update User"
                : "Create User"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RoleModal({
  editingRole,
  roleForm,
  setRoleForm,
  permissionTab,
  setPermissionTab,
  permissionSearch,
  setPermissionSearch,
  specialPermissionGroups,
  filteredCatalog,
  rolePermissions,
  selectedSpecialCount,
  catalogPermissionCodes,
  togglePermission,
  toggleResource,
  togglePermissionCodes,
  pending,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">
              {editingRole ? "Edit Role" : "Create Role"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Configure normal module permissions and special operational
              access.
            </p>
          </div>

          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Role Name *</Label>
              <Input
                className="mt-2"
                value={roleForm.name}
                onChange={(event) =>
                  setRoleForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Label>Role Code *</Label>
              <Input
                className="mt-2"
                value={roleForm.code}
                onChange={(event) =>
                  setRoleForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase().replace(/\s+/g, "_"),
                  }))
                }
                disabled={editingRole?.code === "ADMIN"}
                required
              />
            </div>

            <label className="flex items-end">
              <div className="flex h-10 w-full items-center gap-3 rounded-md border px-3">
                <input
                  type="checkbox"
                  checked={roleForm.is_active}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />

                <span className="text-sm">Active</span>
              </div>
            </label>

            <div className="md:col-span-3">
              <Label>Description</Label>
              <Textarea
                className="mt-2"
                rows={3}
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border">
            <div className="border-b p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold">Permissions</h3>
                  <p className="text-xs text-muted-foreground">
                    {rolePermissions.length} selected · VAT treatment is part of
                    normal transaction access and is no longer a restricted
                    permission.
                  </p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={permissionSearch}
                    onChange={(event) =>
                      setPermissionSearch(event.target.value)
                    }
                    placeholder="Search permissions..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b p-2">
              <button
                type="button"
                onClick={() => setPermissionTab("special")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  permissionTab === "special"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Important Access ({selectedSpecialCount})
              </button>

              <button
                type="button"
                onClick={() => setPermissionTab("catalog")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  permissionTab === "catalog"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                All Permissions
              </button>
            </div>

            {permissionTab === "special" ? (
              <div className="space-y-5 p-4">
                {specialPermissionGroups.map((group) => (
                  <div key={group.key} className="rounded-xl border p-4">
                    <div>
                      <h4 className="font-semibold">{group.label}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {group.permissions.map((permission) => {
                        const checked = rolePermissions.includes(
                          permission.code,
                        );

                        return (
                          <label
                            key={permission.code}
                            className={`cursor-pointer rounded-xl border p-3 ${
                              checked
                                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20"
                                : "hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() =>
                                  togglePermission(permission.code)
                                }
                              />

                              <div>
                                <p className="text-sm font-medium">
                                  {permission.label}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                                <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-[10px]">
                                  {permission.code}
                                </code>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5 p-4">
                {filteredCatalog.map((group) => (
                  <div key={group.module} className="rounded-xl border">
                    <div className="border-b bg-muted/30 px-4 py-3">
                      <h4 className="font-semibold">{group.label}</h4>
                    </div>

                    <div className="divide-y">
                      {(group.resources || []).map((resource) => {
                        const permissionCodes = (resource.actions || []).map(
                          (action) =>
                            buildCatalogPermissionCode(group, resource, action),
                        );

                        const allSelected = permissionCodes.every((code) =>
                          rolePermissions.includes(code),
                        );

                        return (
                          <div key={resource.resource} className="p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="font-medium">{resource.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {resource.resource}
                                </p>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  toggleResource(
                                    group,
                                    resource,
                                    resource.actions || [],
                                  )
                                }
                              >
                                {allSelected ? "Clear" : "Select all"}
                              </Button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {(resource.actions || []).map((action) => {
                                const code = buildCatalogPermissionCode(
                                  group,
                                  resource,
                                  action,
                                );

                                const checked = rolePermissions.includes(code);

                                return (
                                  <label
                                    key={code}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                      checked
                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                                        : "hover:border-blue-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePermission(code)}
                                    />

                                    <span>
                                      {String(action)
                                        .replace(/_/g, " ")
                                        .replace(/\b\w/g, (char) =>
                                          char.toUpperCase(),
                                        )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!filteredCatalog.length && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No permissions match your search.
                  </div>
                )}

                <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
                  Catalog permissions available: {catalogPermissionCodes.size}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving..."
              : editingRole
                ? "Update Role"
                : "Create Role"}
          </Button>
        </div>
      </form>
    </div>
  );
}
