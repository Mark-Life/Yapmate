import { MessageResponse } from "@yapmate/components/ai-elements/message";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@yapmate/components/ui/alert-dialog";

type DeepLinkPromptDialogProps = {
  prompt: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Security confirmation dialog for deep link prompts from external sources.
 * Shows the prompt as rendered markdown and requires user confirmation before sending.
 */
export const DeepLinkPromptDialog = ({
  prompt,
  onConfirm,
  onCancel,
}: DeepLinkPromptDialogProps) => (
  <AlertDialog open={Boolean(prompt)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>External Prompt</AlertDialogTitle>
        <AlertDialogDescription>
          This prompt was provided via a link. Review it carefully before
          sending — external prompts may contain unexpected instructions.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/50 p-3">
        <MessageResponse className="text-sm prose-ul:pl-4 prose-ol:pl-4">{prompt ?? ""}</MessageResponse>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Send</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
