import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Reusable permission component: <Can permission="production.add_batch">
 * Renders children only if user has permission; fallback if specified.
 */
export const Can = ({ permission, role, fallback = null, children }) => {
  const { hasPermission, hasRole } = useAuth();

  if (permission && !(Array.isArray(permission)?permission.some(hasPermission):hasPermission(permission))) {
    return fallback;
  }

  if (role && !hasRole(role)) {
    return fallback;
  }

  return <>{children}</>;
};
