import type { PropsWithChildren } from "react";

import { Navigate, Outlet } from "react-router-dom";

import { Panel } from "@/components/ui/panel";
import { canRoleAccessRoute } from "@contracts/app-contract";
import { getDefaultProtectedRoute } from "@/features/app/route-catalog";

import type { ProtectedAppRoute } from "../auth.types";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  redirectTo?: ProtectedAppRoute;
  requiredRoute?: ProtectedAppRoute;
}

function AccessState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Panel className="max-w-md p-6 text-center sm:p-8">
        <p className="font-display text-2xl font-semibold text-white">Access Control</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
      </Panel>
    </div>
  );
}

export function ProtectedRoute({
  children,
  redirectTo,
  requiredRoute,
}: PropsWithChildren<ProtectedRouteProps>) {
  const { isAuthenticated, session, status } = useAuth();

  if (status === "authenticating") {
    return <AccessState message="Completing secure session authentication." />;
  }

  if (!isAuthenticated || !session) {
    return <Navigate replace to="/login" />;
  }

  const fallbackRoute = redirectTo ?? getDefaultProtectedRoute(session.accessibleRoutes);

  if (
    requiredRoute &&
    (!session.accessibleRoutes.includes(requiredRoute) || !canRoleAccessRoute(session.user.role, requiredRoute))
  ) {
    return <Navigate replace to={fallbackRoute} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
