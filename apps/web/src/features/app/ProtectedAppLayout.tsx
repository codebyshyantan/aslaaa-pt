import { motion } from "framer-motion";
import { LogOut, Shield, TimerReset } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { appName, organizationName } from "@/features/auth/auth.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/cn";

import { getRouteDefinitionByPath, getVisibleRouteDefinitions } from "./route-catalog";

export function ProtectedAppLayout() {
  const location = useLocation();
  const { logout, session, status } = useAuth();

  if (!session) {
    return null;
  }

  const routeDefinition = getRouteDefinitionByPath(location.pathname);
  const visibleRoutes = getVisibleRouteDefinitions(session.accessibleRoutes);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute left-[-10rem] top-[-10rem] h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="absolute bottom-[-14rem] right-[-8rem] h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Panel className="p-5 sm:p-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Shield className="size-4" />
                {organizationName}
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-3xl font-semibold text-white">{appName}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    Internal esports operations workspace with protected routing, live scoring, automation controls, exports, and audit visibility.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signed In</p>
                  <p className="mt-2 font-display text-lg font-semibold text-white">{session.user.username}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {session.user.role === "ADMIN" ? "Admin" : "PT Makers"}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active Module</p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">
                  {routeDefinition?.label ?? "Protected Access"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {routeDefinition?.description ??
                    "Protected internal route access is enforced for this workspace."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <TimerReset className="size-4 text-cyan-200" />
                  Session expires {new Date(session.expiresAt).toLocaleString()}
                </div>
                <Button
                  className="w-auto min-w-[140px]"
                  disabled={status === "logging-out"}
                  onClick={() => void logout()}
                  variant="secondary"
                >
                  <LogOut className="mr-2 size-4" />
                  {status === "logging-out" ? "Signing Out" : "Logout"}
                </Button>
              </div>
            </div>
          </Panel>
        </motion.header>

        <nav className="flex flex-wrap gap-3">
          {visibleRoutes.map((route) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-white",
                  isActive && "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
                )
              }
              key={route.path}
              to={route.path}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </main>
  );
}
