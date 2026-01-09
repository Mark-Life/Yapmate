import { cn } from "@yapmate/components/lib/utils";
import { Loader2Icon } from "lucide-react";
import type * as React from "react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
