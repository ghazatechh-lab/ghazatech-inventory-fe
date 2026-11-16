import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { hasPermission, isAdmin, hasAnyPermission } from "@/lib/permissions";
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

  // Every authenticated user with assigned module permissions receives a personalized dashboard.
  if (location.pathname === "/dashboard") {
    return children;
  }
  // Reports landing page can be opened by users with at least one report view grant.
  if (location.pathname === "/reports" && hasAnyPermission(user, [
    "reports.dashboard.view", "reports.sales.view", "reports.purchase.view",
    "reports.inventory.view", "reports.hrms.view", "reports.finance.view"
  ])) {
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

