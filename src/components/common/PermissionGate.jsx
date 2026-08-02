import React from "react";

import { useAuth } from "@/lib/auth";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAdmin,
} from "@/lib/permissions";

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  adminOnly = false,
  fallback = null,
  children,
}) {
  const { user } = useAuth();

  let allowed = true;

  if (adminOnly) {
    allowed = isAdmin(user);
  } else if (permission) {
    allowed = hasPermission(user, permission);
  } else if (anyOf?.length) {
    allowed = hasAnyPermission(user, anyOf);
  } else if (allOf?.length) {
    allowed = hasAllPermissions(user, allOf);
  }

  return allowed ? children : fallback;
}

export default PermissionGate;
