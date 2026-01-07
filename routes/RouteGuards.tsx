import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '../types';

// For public routes (Home, About, etc.) - anyone can access
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// For authenticated-only routes (Dashboard, Profile, etc.)
export const PrivateRoute: React.FC<{ 
  children: React.ReactNode; 
  user: User | null 
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
  allowedRoles: string[];
}> = ({ children, user, allowedRoles }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// For auth-only routes (Login, Register) - redirect if already logged in
export const AuthRoute: React.FC<{ 
  children: React.ReactNode; 
  user: User | null 
}> = ({ children, user }) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};