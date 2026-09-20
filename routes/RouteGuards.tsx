import React from "react";
import { Navigate } from "react-router-dom";
import type { DefaultRoleCode } from "@/shared/defaultRoleCodes";
import { User } from "../types";
import { getUserRoleCodesForActiveOrg } from "../utils/orgScopedRoles";

// For public routes (Home, About, etc.) - anyone can access
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

// For authenticated-only routes (Dashboard, Profile, etc.)
export const PrivateRoute: React.FC<{
  children: React.ReactNode;
  user: User | null;
}> = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// For role-based routes
export const RoleRoute: React.FC<{
  children: React.ReactNode;
  user: User | null;
  /** Allow-list of Role codes for the active organisation. */
  allowedRoleCodes: DefaultRoleCode[];
}> = ({ children, user, allowedRoleCodes }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    !getUserRoleCodesForActiveOrg(user).some((code) =>
      allowedRoleCodes.includes(code as DefaultRoleCode),
    )
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// For auth-only routes (Login, Register) - redirect if already logged in
export const AuthRoute: React.FC<{
  children: React.ReactNode;
  user: User | null;
}> = ({ children, user }) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
