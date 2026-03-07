import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable label primitive is paired by callers.
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
