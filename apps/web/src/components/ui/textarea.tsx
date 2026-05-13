import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-32 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:bg-black/30 focus:ring-4 focus:ring-cyan-400/10",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
