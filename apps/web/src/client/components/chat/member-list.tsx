/**
 * MemberList component - shows chat members with online status
 */
import { Avatar, AvatarFallback } from "@yapmate/components/ui/avatar";
import { Badge } from "@yapmate/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import { Users } from "lucide-react";
import type { ChatMember } from "../../hooks/use-multi-user-chat";

type MemberListProps = {
  members: ChatMember[];
  typingMembers?: Map<string, string>;
  compact?: boolean;
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
 * Single member avatar with tooltip
 */
const MemberAvatar = ({
  member,
  isTyping,
}: {
  member: ChatMember;
  isTyping: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="relative">
        <Avatar className="size-8 border">
          <AvatarFallback className="text-xs">
            {getInitials(member.displayName)}
          </AvatarFallback>
        </Avatar>
        <OnlineIndicator isOnline={member.isOnline} />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{member.displayName}</span>
        <span className="text-muted-foreground text-xs">
          {member.isOnline ? "Online" : "Offline"}
          {isTyping ? " · Typing..." : ""}
        </span>
      </div>
    </TooltipContent>
  </Tooltip>
);

/**
 * Compact view - stacked avatars
 */
const CompactMemberList = ({
  members,
  typingMembers,
}: {
  members: ChatMember[];
  typingMembers: Map<string, string>;
}) => {
  const visibleMembers = members.slice(0, 4);
  const remainingCount = members.length - 4;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleMembers.map((member) => (
          <MemberAvatar
            isTyping={typingMembers.has(member.userId)}
            key={member.userId}
            member={member}
          />
        ))}
      </div>
      {remainingCount > 0 && (
        <Badge className="ml-2" variant="secondary">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

/**
 * Full member list with names
 */
const FullMemberList = ({
  members,
  typingMembers,
}: {
  members: ChatMember[];
  typingMembers: Map<string, string>;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Users className="size-4" />
      <span>{members.length} members</span>
    </div>
    <div className="flex flex-col gap-1">
      {members.map((member) => {
        const isTyping = typingMembers.has(member.userId);
        return (
          <div
            className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/50"
            key={member.userId}
          >
            <div className="relative">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {getInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>
              <OnlineIndicator isOnline={member.isOnline} />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-sm">{member.displayName}</span>
              {isTyping ? (
                <span className="text-muted-foreground text-xs">Typing...</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * Typing indicator message
 */
export const TypingIndicator = ({
  typingMembers,
}: {
  typingMembers: Map<string, string>;
}) => {
  if (typingMembers.size === 0) {
    return null;
  }

  const names = Array.from(typingMembers.values());
  let message: string;

  if (names.length === 1) {
    message = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    message = `${names[0]} and ${names[1]} are typing...`;
  } else {
    message = `${names.length} people are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-muted-foreground text-sm">
      <div className="flex gap-0.5">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
          .
        </span>
      </div>
      <span>{message}</span>
    </div>
  );
};

/**
 * Member list component
 */
export const MemberList = ({
  members,
  typingMembers = new Map(),
  compact = true,
}: MemberListProps) => {
  if (members.length <= 1) {
    return null;
  }

  if (compact) {
    return (
      <CompactMemberList members={members} typingMembers={typingMembers} />
    );
  }

  return <FullMemberList members={members} typingMembers={typingMembers} />;
};
