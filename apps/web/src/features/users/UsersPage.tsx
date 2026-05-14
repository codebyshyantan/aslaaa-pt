import { useEffect, useState } from "react";

import { PlusCircle, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import type { UserRole } from "@/features/auth/auth.types";
import { ApiClientError } from "@/lib/http-client";

import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  updateUserStatus,
  type ManagedUserRecord,
} from "./api/users-client";

function formatUsersError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the user directory.";
}

export function UsersPage() {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("PT_MAKER");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setError(null);

    try {
      const response = await fetchUsers();
      setUsers(response.users);
    } catch (nextError) {
      setError(formatUsersError(nextError));
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser() {
    setError(null);
    setStatusMessage(null);

    try {
      await createUser({
        password,
        role,
        username,
      });
      setUsername("");
      setPassword("");
      setRole("PT_MAKER");
      setStatusMessage("User created successfully.");
      await loadUsers();
    } catch (nextError) {
      setError(formatUsersError(nextError));
    }
  }

  async function handleToggleUser(user: ManagedUserRecord) {
    setError(null);
    setStatusMessage(null);

    try {
      await updateUserStatus(user.id, !user.isActive);
      setStatusMessage(`User ${user.username} is now ${!user.isActive ? "active" : "inactive"}.`);
      await loadUsers();
    } catch (nextError) {
      setError(formatUsersError(nextError));
    }
  }

  async function handleResetPassword(user: ManagedUserRecord) {
    const nextPassword = window.prompt(`Enter a new temporary password for ${user.username}.`);

    if (!nextPassword) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await resetUserPassword(user.id, nextPassword);
      setStatusMessage(`Password reset for ${user.username}. Existing sessions were revoked.`);
      await loadUsers();
    } catch (nextError) {
      setError(formatUsersError(nextError));
    }
  }

  async function handleDeleteUser(user: ManagedUserRecord) {
    const confirmed = window.confirm(`Delete user ${user.username}? This will revoke access immediately.`);

    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await deleteUser(user.id);
      setStatusMessage(`User ${user.username} deleted.`);
      await loadUsers();
    } catch (nextError) {
      setError(formatUsersError(nextError));
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel className="p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Administration</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Users</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Create internal accounts, assign roles, and activate or disable access without leaving the platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total Users</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{users.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active Users</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">
                {users.filter((user) => user.isActive).length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Create User</p>
            <Input onChange={(event) => setUsername(event.target.value)} placeholder="Username" value={username} />
            <Select onChange={(event) => setRole(event.target.value as UserRole)} value={role}>
              <option className="bg-slate-950" value="PT_MAKER">
                PT Maker
              </option>
              <option className="bg-slate-950" value="ADMIN">
                Admin
              </option>
            </Select>
            <Input
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Temporary password"
              type="password"
              value={password}
            />
            <Button
              className="sm:w-auto"
              disabled={username.trim().length < 3 || password.trim().length < 6}
              onClick={() => void handleCreateUser()}
            >
              <PlusCircle className="mr-2 size-4" />
              Create User
            </Button>
            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {statusMessage}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Directory</p>
          {users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={user.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCog className="size-4 text-cyan-100" />
                      <p className="font-semibold text-white">{user.username}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>{user.role}</span>
                      <span>{user.isActive ? "ACTIVE" : "INACTIVE"}</span>
                      <span>
                        Last login {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "never"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="sm:w-auto" onClick={() => void handleToggleUser(user)} variant="secondary">
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button className="sm:w-auto" onClick={() => void handleResetPassword(user)} variant="secondary">
                      Reset Password
                    </Button>
                    <Button className="sm:w-auto" onClick={() => void handleDeleteUser(user)} variant="secondary">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </section>
  );
}
