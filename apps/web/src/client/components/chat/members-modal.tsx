/**
 * MembersModal - view and manage chat members
 * Allows users to see all members and update their own display name
 */
import { Avatar, AvatarFallback } from "@yapmate/components/ui/avatar";
import { Button } from "@yapmate/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import { Input } from "@yapmate/components/ui/input";
import { Check, Loader2, Pencil, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ChatMember } from "../../hooks/use-multi-user-chat";
import { useUpdateDisplayName } from "../../hooks/use-multi-user-chat";

type MembersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  members: ChatMember[];
  currentUserId: string | null;
};

/** Regex for splitting name into parts */
const WHITESPACE_REGEX = /\s+/;

/**
 * Get initials from display name
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(WHITESPACE_REGEX);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const lastPart = parts.at(-1);
  return (parts[0][0] + (lastPart?.[0] ?? "")).toUpperCase();
};

/**
 * Online indicator dot
 */
const OnlineIndicator = ({ isOnline }: { isOnline: boolean }) => (
  <span
    className={`absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background ${
      isOnline ? "bg-green-500" : "bg-muted"
    }`}
  />
);

/**
 * Single member row with edit capability for current user
 */
const MemberRow = ({
  member,
  isCurrentUser,
  onUpdateDisplayName,
  isUpdating,
}: {
  member: ChatMember;
  isCurrentUser: boolean;
  onUpdateDisplayName: (name: string) => Promise<void>;
  isUpdating: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(member.displayName);

  // Reset edit value when member changes
  useEffect(() => {
    setEditValue(member.displayName);
  }, [member.displayName]);

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error("Display name cannot be empty");
      return;
    }
    if (trimmed === member.displayName) {
      setIsEditing(false);
      return;
    }
    try {
      await onUpdateDisplayName(trimmed);
      toast.success("Display name updated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update display name");
    }
  }, [editValue, member.displayName, onUpdateDisplayName]);

  const handleCancel = useCallback(() => {
    setEditValue(member.displayName);
    setIsEditing(false);
  }, [member.displayName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  return (
    <div className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
      <div className="relative">
        <Avatar className="size-10 border">
          <AvatarFallback className="text-sm">
            {getInitials(member.displayName)}
          </AvatarFallback>
        </Avatar>
        <OnlineIndicator isOnline={member.isOnline} />
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="h-8 text-sm"
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              value={editValue}
            />
            <Button
              className="size-8"
              disabled={isUpdating}
              onClick={handleSave}
              size="icon"
              variant="ghost"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 text-green-500" />
              )}
            </Button>
            <Button
              className="size-8"
              disabled={isUpdating}
              onClick={handleCancel}
              size="icon"
              variant="ghost"
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {member.displayName}
              {isCurrentUser ? (
                <span className="ml-1 text-muted-foreground text-xs">
                  (you)
                </span>
              ) : null}
            </span>
            {isCurrentUser ? (
              <Button
                className="size-6"
                onClick={() => setIsEditing(true)}
                size="icon"
                title="Edit your display name"
                variant="ghost"
              >
                <Pencil className="size-3" />
              </Button>
            ) : null}
          </div>
        )}
        <span className="text-muted-foreground text-xs">
          {member.role === "owner" ? "Owner" : "Member"} ·{" "}
          {member.isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
};

/**
 * MembersModal component
 */
export const MembersModal = ({
  open,
  onOpenChange,
  chatId,
  members,
  currentUserId,
}: MembersModalProps) => {
  const { updateDisplayName, isUpdating } = useUpdateDisplayName(chatId);

  const handleUpdateDisplayName = useCallback(
    async (name: string) => {
      await updateDisplayName(name);
    },
    [updateDisplayName]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Chat Members
          </DialogTitle>
          <DialogDescription>
            {members.length} {members.length === 1 ? "member" : "members"} in
            this chat. Click the edit icon to change your display name.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto py-2">
          {members.map((member) => (
            <MemberRow
              isCurrentUser={member.userId === currentUserId}
              isUpdating={isUpdating}
              key={member.userId}
              member={member}
              onUpdateDisplayName={handleUpdateDisplayName}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
