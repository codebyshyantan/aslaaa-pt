import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LockKeyhole, Shield, User2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { ApiClientError } from "@/lib/http-client";

import { defaultRole, roleOptions, type LoginFormValues } from "../auth.types";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  role: z.enum(["ADMIN", "PT_MAKER"], {
    message: "Select a valid role.",
  }),
  username: z.string().trim().min(1, "Enter a username.").max(64, "Username is too long."),
  password: z.string().min(6, "Password must be at least 6 characters.").max(128, "Password is too long."),
});

type LoginStatus = {
  tone: "default" | "error" | "success";
  message: string;
} | null;

export function LoginForm() {
  const { login, status: authStatus } = useAuth();
  const [status, setStatus] = useState<LoginStatus>({
    tone: "default",
    message: "Secure session-based access is active for Aslaaa PT. Enter your provisioned credentials to continue.",
  });

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: {
      role: defaultRole,
      username: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login({
        ...values,
        username: values.username.trim(),
      });
      setStatus({
        tone: "success",
        message: `Authenticated ${values.username.trim()}. Restoring protected route access now.`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unable to complete sign-in.",
      });
    }
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 24 }}
      transition={{ delay: 0.08, duration: 0.55, ease: "easeOut" }}
    >
      <Panel className="overflow-hidden p-1">
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,14,24,0.92)_0%,rgba(6,10,18,0.82)_100%)] p-6 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                Internal Access
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-semibold text-white">Login</h1>
                <p className="max-w-md text-sm leading-6 text-slate-400">
                  Access the ASLAAA ESPORTS operations dashboard. Public user enumeration is disabled. Use the credentials provisioned by the system administrator.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Role
                </label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        className="pl-11"
                        disabled={authStatus === "authenticating"}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        ref={field.ref}
                        value={field.value}
                      >
                        {roleOptions.map((role) => (
                          <option className="bg-slate-950" key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </div>
                {errors.role ? <p className="text-sm text-rose-300">{errors.role.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Username
                </label>
                <div className="relative">
                  <User2 className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    autoComplete="username"
                    className="pl-11"
                    disabled={authStatus === "authenticating"}
                    placeholder="Enter username"
                    {...register("username")}
                  />
                </div>
                {errors.username ? <p className="text-sm text-rose-300">{errors.username.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    autoComplete="current-password"
                    className="pl-11"
                    disabled={authStatus === "authenticating"}
                    placeholder="Enter password"
                    type="password"
                    {...register("password")}
                  />
                </div>
                {errors.password ? (
                  <p className="text-sm text-rose-300">{errors.password.message}</p>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">
                    Password validation runs on both client and server. Successful login issues an httpOnly session cookie from the API.
                  </p>
                )}
              </div>

              <Button disabled={isSubmitting || authStatus === "authenticating"} type="submit">
                {isSubmitting || authStatus === "authenticating" ? "Authenticating..." : "Login"}
              </Button>
            </form>

            {status ? (
              <div
                className={
                  status.tone === "success"
                    ? "rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
                    : status.tone === "error"
                      ? "rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                      : "rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-slate-300"
                }
              >
                {status.message}
              </div>
            ) : null}
          </div>
        </div>
      </Panel>
    </motion.section>
  );
}
