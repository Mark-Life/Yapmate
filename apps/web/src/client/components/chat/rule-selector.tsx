/**
 * Rule Selector - allows selecting user rules for a chat
 * Shows user's rules in a searchable dialog
 * Controlled component - selections managed by parent
 */

import { useQuery } from "@tanstack/react-query";
import { PromptInputButton } from "@yapmate/components/ai-elements/prompt-input";
import { Badge } from "@yapmate/components/ui/badge";
import { Button } from "@yapmate/components/ui/button";
import { Checkbox } from "@yapmate/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import { Input } from "@yapmate/components/ui/input";
import { Kbd, KbdGroup } from "@yapmate/components/ui/kbd";
import { ScrollArea } from "@yapmate/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import { FileTextIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { HOTKEYS, splitHotkey } from "../../hooks/use-hotkeys-config";
import { rpcClient } from "../../lib/rpc-client";
import { navigate } from "../../router";

type RuleSelectorProps = {
  selectedRuleIds: string[];
  onSelectedRuleIdsChange: (ids: string[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Rule data from server */
type UserRule = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
};

/**
 * Main rule selector component - controlled by parent
 */
export const RuleSelector = ({
  selectedRuleIds,
  onSelectedRuleIdsChange,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RuleSelectorProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  // Fetch user's rules (cached aggressively - rarely changes)
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["userRules"],
    queryFn: () => rpcClient.userRules.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Filter by search query
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) {
      return rules.filter((r) => r.enabled);
    }

    const query = searchQuery.toLowerCase();
    return rules.filter(
      (rule) =>
        rule.enabled &&
        (rule.title.toLowerCase().includes(query) ||
          rule.content.toLowerCase().includes(query))
    );
  }, [rules, searchQuery]);

  // Check if a rule is selected
  const isRuleSelected = useCallback(
    (ruleId: string): boolean => selectedRuleIds.includes(ruleId),
    [selectedRuleIds]
  );

  // Handle rule toggle
  const handleRuleToggle = useCallback(
    (ruleId: string, isSelected: boolean) => {
      if (isSelected) {
        // Remove rule
        onSelectedRuleIdsChange(selectedRuleIds.filter((id) => id !== ruleId));
      } else {
        // Add rule
        onSelectedRuleIdsChange([...selectedRuleIds, ruleId]);
      }
    },
    [selectedRuleIds, onSelectedRuleIdsChange]
  );

  // Count total selected rules
  const selectedCount = selectedRuleIds.length;

  const hasRules = rules.filter((r) => r.enabled).length > 0;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <PromptInputButton
            aria-expanded={open}
            aria-label="AI Rules"
            className="gap-1.5"
            onClick={() => setOpen(true)}
            variant={selectedCount > 0 ? "primaryOutline" : "ghost"}
          >
            <FileTextIcon className="size-4" />
            {selectedCount > 0 ? (
              <Badge className="h-4 min-w-4 px-1 text-[10px] text-primary-foreground">
                {selectedCount}
              </Badge>
            ) : null}
          </PromptInputButton>
        </TooltipTrigger>
        <TooltipContent hideArrow side="top" sideOffset={45}>
          AI Rules{" "}
          <KbdGroup>
            {splitHotkey(HOTKEYS.openRuleSelector).map((key, idx) => (
              <Kbd key={idx}>{key}</Kbd>
            ))}
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="w-[90vw] max-w-md p-0 sm:w-80">
          <DialogTitle className="sr-only">AI Rules</DialogTitle>
          <div className="flex flex-col">
            {/* Search header */}
            <div className="border-b p-2">
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-8"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules..."
                  value={searchQuery}
                />
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="max-h-80">
              <div className="p-2">
                <RuleSelectorContent
                  filteredRules={filteredRules}
                  hasRules={hasRules}
                  isLoading={isLoading}
                  isRuleSelected={isRuleSelected}
                  onRuleToggle={handleRuleToggle}
                />
              </div>
            </ScrollArea>

            {/* Footer with hint */}
            {hasRules ? (
              <div className="border-t px-3 py-2">
                <p className="text-muted-foreground text-xs">
                  Selected rules will be prepended to your messages
                </p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Content area - separated for complexity reduction */
const RuleSelectorContent = ({
  isLoading,
  hasRules,
  filteredRules,
  isRuleSelected,
  onRuleToggle,
}: {
  isLoading: boolean;
  hasRules: boolean;
  filteredRules: UserRule[];
  isRuleSelected: (ruleId: string) => boolean;
  onRuleToggle: (ruleId: string, isSelected: boolean) => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasRules) {
    return (
      <EmptyState
        action={{
          label: "Add rule",
          onClick: () => navigate("/settings/rules"),
        }}
        description="Create custom instructions in Settings"
        title="No rules available"
      />
    );
  }

  if (filteredRules.length === 0) {
    return (
      <EmptyState
        description="Try a different search term"
        title="No matching rules"
      />
    );
  }

  return (
    <div className="space-y-1">
      {filteredRules.map((rule) => {
        const selected = isRuleSelected(rule.id);
        return (
          <RuleItem
            isSelected={selected}
            key={rule.id}
            onToggle={() => onRuleToggle(rule.id, selected)}
            rule={rule}
          />
        );
      })}
    </div>
  );
};

/** Empty state component */
const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <FileTextIcon className="size-8 text-muted-foreground/50" />
    <p className="font-medium text-sm">{title}</p>
    <p className="text-muted-foreground text-xs">{description}</p>
    {action ? (
      <Button onClick={action.onClick} size="sm" variant="default">
        {action.label}
      </Button>
    ) : null}
  </div>
);

/** Individual rule item */
const RuleItem = ({
  rule,
  isSelected,
  onToggle,
}: {
  rule: UserRule;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  const checkboxId = `rule-${rule.id}`;
  const truncatedContent =
    rule.content.length > 100
      ? `${rule.content.slice(0, 100)}...`
      : rule.content;

  return (
    <div className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        id={checkboxId}
        onCheckedChange={onToggle}
      />
      <label
        className="flex min-w-0 flex-1 cursor-pointer flex-col"
        htmlFor={checkboxId}
      >
        <span className="truncate font-medium text-sm">{rule.title}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-2 text-muted-foreground text-xs">
              {truncatedContent}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="right">
            {rule.content}
          </TooltipContent>
        </Tooltip>
      </label>
    </div>
  );
};
