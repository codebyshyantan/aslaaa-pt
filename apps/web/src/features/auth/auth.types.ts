import {
  appName,
  organizationName,
  roleValues,
  type ProtectedAppRoute,
  type UserRole,
} from "@contracts/app-contract";
export { appName, organizationName };
export type { ProtectedAppRoute, UserRole };

export const roleOptions = roleValues.map((value) => ({
  label: value === "ADMIN" ? "Admin" : "PT Makers",
  value,
})) as ReadonlyArray<{ label: string; value: UserRole }>;

export const defaultRole = "ADMIN" satisfies UserRole;

export interface LoginFormValues {
  role: UserRole;
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AuthSession {
  user: AuthenticatedUser;
  accessibleRoutes: ProtectedAppRoute[];
  expiresAt: string;
}
