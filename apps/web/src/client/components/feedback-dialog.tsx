/**
 * Feedback dialog for collecting user feedback
 */
import { useMutation } from "@tanstack/react-query";
import { Button } from "@yapmate/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import { Label } from "@yapmate/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yapmate/components/ui/select";
import { Textarea } from "@yapmate/components/ui/textarea";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useChatContext } from "../contexts/chat-context";
import { usePostHog } from "../hooks/use-posthog";
import { rpcClient } from "../lib/rpc-client";

// use type from schema
type FeedbackCategory = "bug" | "feature" | "general";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
};

/**
 * Collects context information for feedback submission
 */
const collectContext = (chatId: string | null) => ({
  chatId: chatId ?? undefined,
  url: window.location.pathname,
  userAgent: navigator.userAgent,
});

/**
 * Dialog for submitting user feedback
 */
export const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const { currentChatId } = useChatContext();
  const { capture } = usePostHog();

  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");

  const resetForm = useCallback(() => {
    setCategory("general");
    setMessage("");
  }, []);

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const context = collectContext(currentChatId);
      return await rpcClient.feedback.create({
        category,
        message,
        context,
      });
    },
    onSuccess: () => {
      capture("feedback_submitted", { category });
      toast.success("Thanks for your feedback!");
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const handleSubmit = useCallback(() => {
    if (message.trim().length < 10) {
      toast.error("Please provide more detail (at least 10 characters)");
      return;
    }
    feedbackMutation.mutate();
  }, [message, feedbackMutation]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, resetForm]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting bugs, or
            suggesting features.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-category">Category</Label>
            <Select
              onValueChange={(value) => setCategory(value as FeedbackCategory)}
              value={category}
            >
              <SelectTrigger className="w-full" id="feedback-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              className="min-h-[120px]"
              id="feedback-message"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  handleSubmit();
                }
              }}
              placeholder="Tell us what's on your mind..."
              value={message}
            />
            <p className="text-muted-foreground text-xs">
              Press ⌘+Enter to submit
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={message.trim().length < 10 || feedbackMutation.isPending}
            onClick={handleSubmit}
          >
            {feedbackMutation.isPending ? "Sending..." : "Send Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
