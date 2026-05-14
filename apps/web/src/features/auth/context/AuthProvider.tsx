import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { logAuthDiagnostic } from "@/lib/http-client";

import { loginUser, logoutUser } from "../api/auth-client";
import type { AuthSession, LoginFormValues } from "../auth.types";

type AuthStatus = "ready" | "authenticating" | "logging-out";

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (payload: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
  session: AuthSession | null;
  status: AuthStatus;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps extends PropsWithChildren {
  initialSession: AuthSession | null;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [status, setStatus] = useState<AuthStatus>("ready");

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    const clearSession = () => {
      if (session) {
        logAuthDiagnostic("runtime-session-cleared", {
          reason: "auth:unauthorized event received",
          username: session.user.username,
        });
      }

      setSession(null);
      setStatus("ready");
    };

    window.addEventListener("auth:unauthorized", clearSession);
    return () => {
      window.removeEventListener("auth:unauthorized", clearSession);
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session),
      async login(payload) {
        setStatus("authenticating");

        try {
          const nextSession = await loginUser(payload);
          setSession(nextSession);
        } finally {
          setStatus("ready");
        }
      },
      async logout() {
        setStatus("logging-out");

        try {
          await logoutUser();
          setSession(null);
        } finally {
          setStatus("ready");
        }
      },
      session,
      status,
    }),
    [session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
