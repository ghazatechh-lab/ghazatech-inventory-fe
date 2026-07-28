import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Plus,
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

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  return [];
};

/**
 * Convert every supported permission representation into string[].
 *
 * Supported API formats:
 * 1. ["inventory.products.view"]
 * 2. [{ code: "inventory.products.view" }]
 * 3. '{"inventory.products.view": true}'
 * 4. {"inventory": {"products": {"view": true}}}
 * 5. "inventory.products.view,inventory.products.create"
 */
const normalizePermissions = (value) => {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value.flatMap((item) => {
          if (typeof item === "string") {
            return item.trim() ? [item.trim()] : [];
          }

          if (item && typeof item === "object") {
            const code =
              item.code || item.permission_code || item.permission || item.name;

            return typeof code === "string" && code.trim() ? [code.trim()] : [];
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
            .map((item) => item.trim())
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
          codes.push(path.join("."));
        }
        return;
      }

      if (node === false || node === null || node === undefined) {
        return;
      }

      if (Array.isArray(node)) {
        node.forEach((item) => {
          if (typeof item === "string" && item.trim()) {
            codes.push(item.trim());
          } else if (item && typeof item === "object") {
            const code =
              item.code || item.permission_code || item.permission || item.name;

            if (typeof code === "string" && code.trim()) {
              codes.push(code.trim());
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

export default function UserRoleManagementPage() {
  const queryClient = useQueryClient();

  const [userOpen, setUserOpen] = React.useState(false);
  const [roleOpen, setRoleOpen] = React.useState(false);

  const [userForm, setUserForm] = React.useState(emptyUser);
  const [roleForm, setRoleForm] = React.useState(emptyRole);

  const [editingUser, setEditingUser] = React.useState(null);
  const [editingRole, setEditingRole] = React.useState(null);

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
    () => normalizePermissions(roleForm.permissions),
    [roleForm.permissions],
  );

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
      const payload = {
        ...roleForm,
        permissions: normalizePermissions(roleForm.permissions),
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

    setRoleForm(
      role
        ? {
            name: role.name || "",
            code: role.code || "",
            description: role.description || "",
            permissions: normalizePermissions(role.permissions),
            is_active:
              role.is_active === undefined ? true : Boolean(role.is_active),
          }
        : emptyRole,
    );

    setRoleOpen(true);
  };

  const togglePermission = (code) => {
    setRoleForm((current) => {
      const currentPermissions = normalizePermissions(current.permissions);

      return {
        ...current,
        permissions: currentPermissions.includes(code)
          ? currentPermissions.filter((permission) => permission !== code)
          : [...currentPermissions, code],
      };
    });
  };

  const toggleResource = (moduleCode, resourceCode, actions) => {
    const permissionCodes = actions.map(
      (action) => `${moduleCode}.${resourceCode}.${action}`,
    );

    setRoleForm((current) => {
      const currentPermissions = normalizePermissions(current.permissions);

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
    <div className="space-y-5">
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
          <div className="flex justify-end">
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
                const permissions = normalizePermissions(role.permissions);

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

      {userOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              userMutation.mutate();
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

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setUserOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {[
                ["Full Name", "full_name"],
                ["Email", "email"],
                ["Username", "username"],
                [
                  editingUser ? "New Password (optional)" : "Password",
                  "password",
                ],
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
                    .filter((role) => role.is_active)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>

              {employeeRequired && (
                <div>
                  <Label>Employee Code *</Label>

                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                    value={userForm.employee}
                    onChange={(event) => {
                      const employee = employees.find(
                        (item) => String(item.id) === event.target.value,
                      );

                      setUserForm((current) => ({
                        ...current,
                        employee: event.target.value,
                        branch: employee?.branch
                          ? String(employee.branch)
                          : current.branch,
                        full_name:
                          current.full_name || employee?.full_name || "",
                      }));
                    }}
                    required
                  >
                    <option value="">Select employee</option>

                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employee_code} — {employee.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label>Branch</Label>

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
                  <option value="">All / Employee branch</option>

                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2">
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
                Active user
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserOpen(false)}
              >
                Cancel
              </Button>

              <Button disabled={userMutation.isPending}>Save User</Button>
            </div>
          </form>
        </div>
      )}

      {roleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              roleMutation.mutate();
            }}
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingRole ? "Edit Role" : "Create Role"}
                </h2>

                <p className="text-sm text-muted-foreground">
                  Select exactly which operations this role can access.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setRoleOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Role Name *</Label>

                <Input
                  value={roleForm.name}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label>Role Code *</Label>

                <Input
                  value={roleForm.code}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      code: event.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "_"),
                    }))
                  }
                  className="mt-2"
                  required
                  disabled={editingRole?.code === "ADMIN"}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Description</Label>

                <Textarea
                  value={roleForm.description}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-5 border-t p-5">
              {catalog.map((group) => (
                <section key={group.module} className="rounded-xl border">
                  <h3 className="border-b bg-muted/40 px-4 py-3 font-semibold">
                    {group.label}
                  </h3>

                  <div className="divide-y">
                    {(group.resources || []).map((resource) => {
                      const actions = Array.isArray(resource.actions)
                        ? resource.actions
                        : [];

                      const codes = actions.map(
                        (action) =>
                          `${group.module}.${resource.resource}.${action}`,
                      );

                      const checked =
                        codes.length > 0 &&
                        codes.every((code) => rolePermissions.includes(code));

                      return (
                        <div key={resource.resource} className="p-4">
                          <label className="flex items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleResource(
                                  group.module,
                                  resource.resource,
                                  actions,
                                )
                              }
                            />

                            {resource.label}
                          </label>

                          <div className="mt-3 flex flex-wrap gap-3">
                            {actions.map((action) => {
                              const code = `${group.module}.${resource.resource}.${action}`;

                              return (
                                <label
                                  key={action}
                                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={rolePermissions.includes(code)}
                                    onChange={() => togglePermission(code)}
                                  />

                                  <span className="capitalize">
                                    {action.replace(/_/g, " ")}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {!catalog.length && (
                <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                  No permission catalogue was returned by the API.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleOpen(false)}
              >
                Cancel
              </Button>

              <Button disabled={roleMutation.isPending}>Save Role</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
