/**
 * JoinChat page - handles invite link joins
 * URL: /invite/:code
 */
import { Button } from "@yapmate/components/ui/button";
import { Input } from "@yapmate/components/ui/input";
import { Label } from "@yapmate/components/ui/label";
import { AlertCircle, CheckCircle, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useJoinChat } from "../hooks/use-multi-user-chat";
import { navigate } from "../router";

type JoinChatPageProps = {
  code: string;
};

/**
 * JoinChat page component
 */
export const JoinChatPage = ({ code }: JoinChatPageProps) => {
  const { validateInvite, isValidating, validationData, joinChat, isJoining } =
    useJoinChat();

  const [displayName, setDisplayName] = useState("");
  const [hasValidated, setHasValidated] = useState(false);

  // Validate invite on mount
  useEffect(() => {
    if (!hasValidated && code) {
      validateInvite(code)
        .then(() => setHasValidated(true))
        .catch(() => setHasValidated(true));
    }
  }, [code, hasValidated, validateInvite]);

  // Pre-fill display name
  useEffect(() => {
    if (validationData?.defaultDisplayName) {
      setDisplayName(validationData.defaultDisplayName);
    }
  }, [validationData?.defaultDisplayName]);

  const handleJoin = useCallback(async () => {
    if (!validationData?.chatId) {
      return;
    }

    const nameToUse = validationData.needsDisplayName
      ? displayName.trim()
      : undefined;
    if (validationData.needsDisplayName && !nameToUse) {
      toast.error("Please enter a display name");
      return;
    }

    try {
      await joinChat({
        chatId: validationData.chatId,
        inviteCode: code,
        displayName: nameToUse,
      });
      toast.success("Joined chat successfully!");
      navigate(`/chat/${validationData.chatId}`);
    } catch {
      toast.error("Failed to join chat. The invite may have expired.");
    }
  }, [code, displayName, joinChat, validationData]);

  // Already a member
  if (validationData?.alreadyMember && validationData.chatId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="size-12 text-green-500" />
            <h1 className="font-semibold text-xl">Already a Member</h1>
            <p className="text-muted-foreground">
              You're already part of this chat.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate(`/chat/${validationData.chatId}`)}
            >
              Go to Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading / validating
  if (isValidating || !hasValidated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Validating invite...</p>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (!validationData?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-12 text-destructive" />
            <h1 className="font-semibold text-xl">Invalid Invite</h1>
            <p className="text-muted-foreground">
              {validationData?.error ||
                "This invite link is invalid or has expired."}
            </p>
            <Button
              className="w-full"
              onClick={() => navigate("/")}
              variant="outline"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite - show join form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Users className="size-12 text-primary" />
            <h1 className="font-semibold text-xl">Join Chat</h1>
            <p className="font-medium text-lg">{validationData.chatTitle}</p>
          </div>

          {/* Members preview */}
          {validationData.memberNames &&
            validationData.memberNames.length > 0 && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="mb-1 text-muted-foreground text-sm">
                  Current members:
                </p>
                <p className="font-medium text-sm">
                  {validationData.memberNames.join(", ")}
                </p>
              </div>
            )}

          {/* Display name input */}
          {validationData.needsDisplayName ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Your Display Name</Label>
              <Input
                id="displayName"
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                value={displayName}
              />
              <p className="text-muted-foreground text-xs">
                This is how you'll appear to other members in this chat.
              </p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={
                isJoining ||
                (validationData.needsDisplayName && !displayName.trim())
              }
              onClick={handleJoin}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Chat"
              )}
            </Button>
            <Button
              className="w-full"
              onClick={() => navigate("/")}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
