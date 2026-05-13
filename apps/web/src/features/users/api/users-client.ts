import { apiRequest } from "@/lib/http-client";

import type { UserRole } from "@/features/auth/auth.types";

export interface ManagedUserRecord {
  createdAt: string;
  id: string;
  isActive: boolean;
  lastLoginAt: string | null;
  role: UserRole;
  updatedAt: string;
  username: string;
}

export function fetchUsers() {
  return apiRequest<{ users: ManagedUserRecord[] }>("/users", {
    method: "GET",
  });
}

export function createUser(payload: {
  password: string;
  role: UserRole;
  username: string;
}) {
  return apiRequest<ManagedUserRecord>("/users", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function updateUserStatus(id: string, isActive: boolean) {
  return apiRequest<ManagedUserRecord>(`/users/${id}/status`, {
    body: JSON.stringify({ isActive }),
    method: "PATCH",
  });
}
