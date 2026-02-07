import type { MessageError as MessageErrorType } from "@yapmate/db/schema";
import { Alert, AlertDescription } from "@yapmate/components/ui/alert";
import { Button } from "@yapmate/components/ui/button";
import { AlertCircleIcon, RefreshCcwIcon } from "lucide-react";

type MessageErrorProps = {
  error: Omit<MessageErrorType, "raw">;
  onRetry: () => void;
};

const NON_RETRYABLE_HINTS: Partial<
  Record<MessageErrorType["code"], string>
> = {
  insufficient_balance: "Check your provider account balance",
  content_filtered: "Try rephrasing your message",
  bad_request: "Try a different model or prompt",
};

/**
 * Inline error banner rendered below a failed assistant message
 */
export const MessageError = ({ error, onRetry }: MessageErrorProps) => {
  const hint = !error.retryable ? NON_RETRYABLE_HINTS[error.code] : undefined;

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span>{error.message}</span>
          {hint && (
            <span className="text-muted-foreground text-xs">{hint}</span>
          )}
        </div>
        <Button onClick={onRetry} size="sm" variant="ghost">
          <RefreshCcwIcon className="size-3" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
};
