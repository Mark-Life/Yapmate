import { Skeleton } from "@yapmate/components/ui/skeleton";

/**
 * Loading skeleton for messages history
 * Shows horizontal skeleton lines
 */
export const MessagesSkeleton = () => (
  <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <Skeleton className="h-7 w-1/2" />
    <Skeleton className="ml-auto h-7 w-2/5 bg-primary/5" />
    <Skeleton className="h-7 w-3/5" />
    <Skeleton className="ml-auto h-7 w-1/2 bg-primary/5" />
    <Skeleton className="h-7 w-2/5" />
  </div>
);
