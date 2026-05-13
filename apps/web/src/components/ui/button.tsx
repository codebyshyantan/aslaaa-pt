import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "bg-[linear-gradient(135deg,rgba(136,242,216,1)_0%,rgba(51,181,255,0.95)_100%)] text-slate-950 shadow-[0_16px_48px_rgba(51,181,255,0.35)] hover:brightness-105",
  secondary:
    "border border-white/12 bg-white/6 text-slate-100 hover:border-white/18 hover:bg-white/10",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold tracking-[0.18em] uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
