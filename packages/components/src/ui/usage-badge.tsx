/**
 * Usage badge component - displays subscription tier and message usage
 * Used in sidebar footer to show current plan status
 */
import { cn } from "@yapmate/components/lib/utils";
import { ArrowUpRightIcon, SparklesIcon } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Progress } from "./progress";

/** Subscription tier type */
type Tier = "free" | "hobby" | "pro" | "unlimited";

/** Tier display configuration */
const TIER_CONFIG: Record<Tier, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  hobby: { label: "Hobby", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  pro: { label: "Pro", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  unlimited: { label: "Unlimited", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

/**
 * Formats date as "Jan 31"
 */
const formatResetDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Gets progress bar color based on usage percentage
 */
const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "var(--destructive)";
  if (percentage >= 70) return "var(--warning, #f59e0b)";
  return "";
};

type UsageBadgeProps = {
  tier: Tier;
  count: number;
  /** Message limit (null = unlimited) */
  limit: number | null;
  resetsAt: string;
  onUpgradeClick?: () => void;
  className?: string;
};

/**
 * Compact badge showing subscription tier and usage
 * Displays progress bar and upgrade button when applicable
 */
export const UsageBadge = ({
  tier,
  count,
  limit,
  resetsAt,
  onUpgradeClick,
  className,
}: UsageBadgeProps) => {
  const config = TIER_CONFIG[tier];
  const isUnlimited = tier === "unlimited" || limit === null;
  const percentage = isUnlimited ? 0 : Math.min((count / limit) * 100, 100);
  const canUpgrade = tier !== "pro" && tier !== "unlimited";
  const progressColor = getProgressColor(percentage);

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg bg-muted/50 p-3", className)}>
      {/* Header: Tier badge + Upgrade button */}
      <div className="flex items-center justify-between">
        <Badge className={cn("gap-1", config.color)} variant="outline">
          <SparklesIcon className="size-3" />
          {config.label}
        </Badge>
        {canUpgrade && onUpgradeClick && (
          <Button
            className="h-6 gap-1 px-2 text-xs"
            onClick={onUpgradeClick}
            size="sm"
            variant="ghost"
          >
            Upgrade
            <ArrowUpRightIcon className="size-3" />
          </Button>
        )}
      </div>

      {/* Usage stats */}
      {isUnlimited ? (
        <p className="text-muted-foreground text-xs">Unlimited messages</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{count}</span>
              {" / "}
              {(limit ?? 0).toLocaleString()} messages
            </span>
            <span className="text-muted-foreground">
              Resets {formatResetDate(resetsAt)}
            </span>
          </div>
          <Progress
            style={
              progressColor
                ? ({ "--progress-color": progressColor } as React.CSSProperties)
                : undefined
            }
            value={percentage}
          />
        </>
      )}
    </div>
  );
};
