import { Navigate } from "react-router-dom";

import { getDefaultProtectedRoute } from "@/features/app/route-catalog";

import { useAuth } from "./hooks/useAuth";
import { BrandPanel } from "./components/BrandPanel";
import { LoginForm } from "./components/LoginForm";

export function AuthPage() {
  const { session } = useAuth();

  if (session) {
    return <Navigate replace to={getDefaultProtectedRoute(session.accessibleRoutes)} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="absolute left-[-12rem] top-[-12rem] h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="absolute bottom-[-14rem] right-[-8rem] h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_16%,transparent_84%,rgba(255,255,255,0.03))]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.85fr] lg:items-stretch">
        <div className="order-1 flex items-center lg:order-2">
          <LoginForm />
        </div>
        <div className="order-2 lg:order-1">
          <BrandPanel />
        </div>
      </div>
    </main>
  );
}
