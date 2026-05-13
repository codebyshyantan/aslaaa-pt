import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/6 shadow-[0_24px_80px_rgba(6,10,18,0.45)] backdrop-blur-2xl",
        className,
      )}
      {...props}
    />
  );
}
