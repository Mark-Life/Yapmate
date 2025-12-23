"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@yapmate/components/lib/utils";
import type * as React from "react";

function Progress({
  className,
  value,
  style,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // Extract custom progress color from CSS variable if provided
  const rootStyle = style as React.CSSProperties & {
    "--progress-color"?: string;
  } | undefined;
  const progressColor = rootStyle?.["--progress-color"];

  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      data-slot="progress"
      style={style}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          progressColor ? "" : "bg-primary"
        )}
        data-slot="progress-indicator"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          ...(progressColor && { backgroundColor: progressColor }),
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
