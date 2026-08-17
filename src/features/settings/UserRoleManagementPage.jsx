import React from "react";
import {
  Edit,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api, { getApiErrorDetails, unwrap } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }
  return [];
};

const normalizeCatalog = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.modules)) return value.modules;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.modules)) {
    return value.data.modules;
  }
  return [];
};

const normalizePermissions = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) =>
            typeof item === "string"
              ? item.trim()
              : String(
                  item?.code || item?.permission_code || item?.permission || "",
                ).trim(),
          )
          .filter(Boolean),
      ),
    );
  }

  return [];
};

const permissionCode = (group, resource, action) => {
  const prefix = resource.code_prefix || `${group.module}.${resource.resource}`;

  return `${prefix}.${action}`;
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
  permissions: [],
  is_active: true,
};

const emptyRole = {
  name: "",
  code: "",
  description: "",
  is_active: true,
};

export default function UserRoleManagementPage() {
  const queryClient = useQueryClient();

  const [userOpen, setUserOpen] = React.useState(false);

  const [roleOpen, setRoleOpen] = React.useState(false);

  const [editingUser, setEditingUser] = React.useState(null);

  const [editingRole, setEditingRole] = React.useState(null);

  const [userForm, setUserForm] = React.useState(emptyUser);

  const [roleForm, setRoleForm] = React.useState(emptyRole);

  const [permissionSearch, setPermissionSearch] = React.useState("");

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

  const employees = React.useMemo(
    () => normalizeList(optionsData?.employees),
    [optionsData],
  );

  const branches = React.useMemo(
    () => normalizeList(optionsData?.branches),
    [optionsData],
  );

  const catalog = React.useMemo(
    () => normalizeCatalog(catalogData),
    [catalogData],
  );

  const selectedRole = roles.find(
    (role) => String(role.id) === String(userForm.role),
  );

  const employeeRequired =
    selectedRole && String(selectedRole.code || "").toUpperCase() !== "ADMIN";

  const currentPermissions = normalizePermissions(userForm.permissions);

  const filteredCatalog = React.useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();

    return catalog
      .map((group) => ({
        ...group,
        resources: (group.resources || [])
          .map((resource) => ({
            ...resource,
            actions: (resource.actions || []).filter((action) => {
              if (!search) {
                return true;
              }

              const code = permissionCode(group, resource, action);

              return [
                group.label,
                group.module,
                resource.label,
                resource.resource,
                action,
                code,
              ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search));
            }),
          }))
          .filter((resource) => resource.actions.length),
      }))
      .filter((group) => group.resources.length);
  }, [catalog, permissionSearch]);

  const showError = (error, fallback) => {
    const details = getApiErrorDetails(error);

    toast.error(details.title || fallback, {
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

        permissions: currentPermissions,
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

      toast.success(
        editingUser ? "User and permissions updated" : "User created",
      );

      setUserOpen(false);
      setEditingUser(null);
      setUserForm(emptyUser);
    },

    onError: (error) => showError(error, "Unable to save user"),
  });

  const roleMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        is_active: roleForm.is_active,
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
      await queryClient.invalidateQueries({
        queryKey: ["admin-roles"],
      });

      toast.success(editingRole ? "Role updated" : "Role created");

      setRoleOpen(false);
      setEditingRole(null);
      setRoleForm(emptyRole);
    },

    onError: (error) => showError(error, "Unable to save role"),
  });

  const openUser = (user = null) => {
    setEditingUser(user);

    setPermissionSearch("");

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
            permissions: normalizePermissions(
              user.permissions || user.effective_permissions,
            ),
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
            is_active: role.is_active !== false,
          }
        : emptyRole,
    );

    setRoleOpen(true);
  };

  const togglePermission = (code) => {
    setUserForm((current) => {
      const permissions = normalizePermissions(current.permissions);

      return {
        ...current,

        permissions: permissions.includes(code)
          ? permissions.filter((permission) => permission !== code)
          : Array.from(new Set([...permissions, code])),
      };
    });
  };

  const toggleResource = (group, resource) => {
    const codes = (resource.actions || []).map((action) =>
      permissionCode(group, resource, action),
    );

    const allSelected = codes.every((code) =>
      currentPermissions.includes(code),
    );

    setUserForm((current) => {
      const permissions = normalizePermissions(current.permissions);

      return {
        ...current,

        permissions: allSelected
          ? permissions.filter((code) => !codes.includes(code))
          : Array.from(new Set([...permissions, ...codes])),
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
        title="Users & Access"
        subtitle="Roles identify the employee's job function. Permissions are assigned directly to each user."
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & Permissions</TabsTrigger>

          <TabsTrigger value="roles">Roles</TabsTrigger>
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
                  <th>Permissions</th>
                  <th>Status</th>
                  <th className="pr-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {usersLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => {
                    const permissions = normalizePermissions(
                      user.effective_permissions || user.permissions,
                    );

                    return (
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
                            "—"}
                        </td>

                        <td>
                          {permissions.includes("*")
                            ? "Full Access"
                            : `${permissions.length} selected`}
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
                              title="Edit user and permissions"
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
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
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
              roles.map((role) => (
                <div key={role.id} className="card-surface p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>

                      <p className="text-xs text-muted-foreground">
                        {role.code} · {role.user_count || 0} user(s)
                      </p>
                    </div>

                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {role.description || "No description"}
                  </p>

                  <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Role is for job title/grouping only. Access permissions are
                    configured on each user.
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openRole(role)}
                    >
                      Edit
                    </Button>

                    {String(role.code || "").toUpperCase() !== "ADMIN" && (
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
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {userOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              userMutation.mutate();
            }}
            className="mx-auto my-5 w-full max-w-6xl overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingUser ? "Edit User & Permissions" : "Create User"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Permissions configured here apply only to this user.
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

            <div className="grid gap-5 p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                <h3 className="font-semibold">Account Details</h3>

                <Field label="Full Name">
                  <Input
                    value={userForm.full_name}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Email *">
                  <Input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Username *">
                  <Input
                    required
                    value={userForm.username}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label={editingUser ? "New Password" : "Password *"}>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Role *">
                  <select
                    required
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={userForm.role}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        role: event.target.value,
                        employee: "",
                      }))
                    }
                  >
                    <option value="">Select role</option>

                    {roles
                      .filter((role) => role.is_active !== false)
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </Field>

                {employeeRequired && (
                  <Field label="Employee *">
                    <select
                      required
                      className="h-10 w-full rounded-md border bg-background px-3"
                      value={userForm.employee}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          employee: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select employee</option>

                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name} · {employee.employee_code}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Default Branch">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={userForm.branch}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        branch: event.target.value,
                      }))
                    }
                  >
                    <option value="">No default branch</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_code} · {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <label className="flex items-center gap-3 rounded-xl border p-4">
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

                  <span className="text-sm font-medium">Active User</span>
                </label>
              </div>

              <div className="min-w-0">
                <div className="sticky top-0 z-10 bg-background pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-blue-600" />

                        <h3 className="font-semibold">User Permissions</h3>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {currentPermissions.length} permission(s) selected
                        directly for this user.
                      </p>
                    </div>

                    <div className="relative w-full md:w-80">
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

                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                    There is one stock system only. Restricted/non-restricted
                    stock permissions and VAT/non-VAT transaction permissions
                    have been removed.
                  </div>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                  {filteredCatalog.map((group) => (
                    <section
                      key={group.module}
                      className="overflow-hidden rounded-xl border"
                    >
                      <div className="border-b bg-muted/30 px-4 py-3">
                        <h4 className="font-semibold">{group.label}</h4>
                      </div>

                      <div className="divide-y">
                        {group.resources.map((resource) => {
                          const codes = resource.actions.map((action) =>
                            permissionCode(group, resource, action),
                          );

                          const allSelected = codes.every((code) =>
                            currentPermissions.includes(code),
                          );

                          return (
                            <div key={resource.resource} className="p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">
                                    {resource.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {resource.resource}
                                  </p>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    toggleResource(group, resource)
                                  }
                                >
                                  {allSelected ? "Clear" : "Select all"}
                                </Button>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {resource.actions.map((action) => {
                                  const code = permissionCode(
                                    group,
                                    resource,
                                    action,
                                  );

                                  const checked =
                                    currentPermissions.includes(code);

                                  return (
                                    <label
                                      key={code}
                                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                        checked
                                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
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
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={userMutation.isPending}>
                {userMutation.isPending
                  ? "Saving..."
                  : editingUser
                    ? "Update User"
                    : "Create User"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {roleOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              roleMutation.mutate();
            }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingRole ? "Edit Role" : "Create Role"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Roles are job titles/groups only. Permissions are assigned
                  from the user form.
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
              <Field label="Role Name *">
                <Input
                  required
                  value={roleForm.name}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Role Code *">
                <Input
                  required
                  disabled={editingRole?.code === "ADMIN"}
                  value={roleForm.code}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      code: event.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "_"),
                    }))
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea
                    rows={4}
                    value={roleForm.description}
                    onChange={(event) =>
                      setRoleForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <label className="md:col-span-2 flex items-center gap-3 rounded-xl border p-4">
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

                <span className="font-medium">Active Role</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={roleMutation.isPending}>
                {roleMutation.isPending ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
