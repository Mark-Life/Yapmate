import { MessageAction } from "@yapmate/components/ai-elements/message";
import { Button } from "@yapmate/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@yapmate/components/ui/popover";
import { Textarea } from "@yapmate/components/ui/textarea";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useState } from "react";
import { usePostHog } from "../../hooks/use-posthog";

export type FeedbackState = 0 | 1 | null;

type FeedbackButtonsProps = {
  disabled: boolean;
  feedback: FeedbackState;
  messageId: string;
  onFeedback: (messageId: string, value: 0 | 1, comment?: string) => void;
};

/**
 * Renders thumbs up/down feedback buttons with optional comment popover
 */
export const FeedbackButtons = ({
  disabled,
  feedback,
  messageId,
  onFeedback,
}: FeedbackButtonsProps) => {
  const { capture } = usePostHog();
  const [comment, setComment] = useState("");
  const [openValue, setOpenValue] = useState<0 | 1 | null>(null);

  const handleSubmit = (value: 0 | 1) => {
    capture("feedback_submitted", {
      message_id: messageId,
      feedback_value: value,
      has_comment: !!comment,
      comment_length: comment.length,
    });
    onFeedback(messageId, value, comment || undefined);
    setOpenValue(null);
    setComment("");
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    value: 0 | 1
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpenValue(null);
      setComment("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOpenValue(null);
      setComment("");
    }
  };

  return (
    <>
      <Popover onOpenChange={handleOpenChange} open={openValue === 1}>
        <PopoverTrigger asChild>
          <MessageAction
            className={feedback === 1 ? "text-green-500" : undefined}
            disabled={disabled}
            label="Good response"
            onClick={() => setOpenValue(1)}
            tooltip={
              feedback === 1 ? "Positive feedback sent" : "Good response"
            }
          >
            <ThumbsUpIcon className="size-3" />
          </MessageAction>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-3">
            <p className="font-medium text-sm">What did you like? (optional)</p>
            <Textarea
              className="min-h-16 resize-none text-sm"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              placeholder="Add a comment..."
              value={comment}
            />
            <Button onClick={() => handleSubmit(1)} size="sm">
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Popover onOpenChange={handleOpenChange} open={openValue === 0}>
        <PopoverTrigger asChild>
          <MessageAction
            className={feedback === 0 ? "text-red-500" : undefined}
            disabled={disabled}
            label="Bad response"
            onClick={() => setOpenValue(0)}
            tooltip={feedback === 0 ? "Negative feedback sent" : "Bad response"}
          >
            <ThumbsDownIcon className="size-3" />
          </MessageAction>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-3">
            <p className="font-medium text-sm">What went wrong? (optional)</p>
            <Textarea
              className="min-h-16 resize-none text-sm"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              placeholder="Add a comment..."
              value={comment}
            />
            <Button onClick={() => handleSubmit(0)} size="sm">
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
