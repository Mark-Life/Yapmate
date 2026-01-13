/**
 * InviteModal - generate and manage invite links for multi-user chat
 */
import { Button } from "@yapmate/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import { Input } from "@yapmate/components/ui/input";
import { Check, Copy, Link2, Loader2, Trash2, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useInvites } from "../../hooks/use-multi-user-chat";

type InviteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
};

/**
 * Format expiration time
 */
const formatExpiry = (expiresAt: number): string => {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

/**
 * Generate invite URL from code
 */
const getInviteUrl = (code: string): string =>
  `${window.location.origin}/invite/${code}`;

/**
 * Single invite row
 */
const InviteRow = ({
  code,
  expiresAt,
  onRevoke,
  isRevoking,
}: {
  code: string;
  expiresAt: number;
  onRevoke: () => void;
  isRevoking: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const inviteUrl = getInviteUrl(code);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [inviteUrl]);

  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <Input
        className="flex-1 text-sm"
        onClick={(e) => (e.target as HTMLInputElement).select()}
        readOnly
        value={inviteUrl}
      />
      <Button
        className="shrink-0"
        onClick={handleCopy}
        size="icon"
        variant="outline"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
      <Button
        className="shrink-0"
        disabled={isRevoking}
        onClick={onRevoke}
        size="icon"
        variant="outline"
      >
        {isRevoking ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4 text-destructive" />
        )}
      </Button>
      <span className="shrink-0 text-muted-foreground text-xs">
        {formatExpiry(expiresAt)}
      </span>
    </div>
  );
};

type Invite = {
  code: string;
  expiresAt: number;
};

/**
 * Invites list section - separate component to avoid nested ternary
 */
const InvitesList = ({
  invites,
  isRevoking,
  onRevoke,
}: {
  invites: Invite[];
  isRevoking: boolean;
  onRevoke: (code: string) => void;
}) => {
  if (invites.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        No active invite links. Create one to share!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-muted-foreground text-sm">
        Active Invites ({invites.length})
      </h4>
      {invites.map((invite) => (
        <InviteRow
          code={invite.code}
          expiresAt={invite.expiresAt}
          isRevoking={isRevoking}
          key={invite.code}
          onRevoke={() => onRevoke(invite.code)}
        />
      ))}
    </div>
  );
};

/**
 * InviteModal component
 */
export const InviteModal = ({
  open,
  onOpenChange,
  chatId,
}: InviteModalProps) => {
  const {
    invites,
    isLoading,
    createInvite,
    isCreating,
    revokeInvite,
    isRevoking,
  } = useInvites(chatId);

  const handleCreateInvite = useCallback(async () => {
    try {
      const result = await createInvite();
      const url = getInviteUrl(result.code);
      await navigator.clipboard.writeText(url);
      toast.success("Invite link created and copied!");
    } catch {
      toast.error("Failed to create invite link");
    }
  }, [createInvite]);

  const handleRevokeInvite = useCallback(
    async (code: string) => {
      try {
        await revokeInvite(code);
        toast.success("Invite link revoked");
      } catch {
        toast.error("Failed to revoke invite");
      }
    },
    [revokeInvite]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Invite People
          </DialogTitle>
          <DialogDescription>
            Share an invite link to let others join this chat. Links expire
            after 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Button
            className="w-full"
            disabled={isCreating}
            onClick={handleCreateInvite}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="mr-2 size-4" />
                Create Invite Link
              </>
            )}
          </Button>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InvitesList
              invites={invites}
              isRevoking={isRevoking}
              onRevoke={handleRevokeInvite}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
