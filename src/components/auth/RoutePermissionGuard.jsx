import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { getRoutePermission } from "@/config/routePermissions";

export default function RoutePermissionGuard({ children }) {
  const location = useLocation();

  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin(user)) {
    return children;
  }

  const requiredPermission = getRoutePermission(location.pathname);

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          from: location.pathname,
          permission: requiredPermission,
        }}
      />
    );
  }

  return children;
}
