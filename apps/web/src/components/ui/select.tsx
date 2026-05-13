import { forwardRef, type SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 pr-12 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:bg-black/30 focus:ring-4 focus:ring-cyan-400/10",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
      </div>
    );
  },
);

Select.displayName = "Select";
