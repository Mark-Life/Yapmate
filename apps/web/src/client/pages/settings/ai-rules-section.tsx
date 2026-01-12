/**
 * AI Rules settings section
 * Allows users to manage their custom instructions/rules
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { Input } from "@yapmate/components/ui/input";
import { Label } from "@yapmate/components/ui/label";
import { Separator } from "@yapmate/components/ui/separator";
import { Switch } from "@yapmate/components/ui/switch";
import { Textarea } from "@yapmate/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import {
  FileTextIcon,
  GripVerticalIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { rpcClient } from "../../lib/rpc-client";

/**
 * Settings field wrapper with label and optional description
 */
const SettingsField = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-col gap-0.5">
      <Label className="font-medium text-sm">{label}</Label>
      {description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
    </div>
    {children}
  </div>
);

/**
 * Sortable rule card component
 */
const SortableRuleCard = ({
  rule,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  rule: {
    id: string;
    title: string;
    content: string;
    enabled: boolean;
  };
  onUpdate: (data: {
    title?: string;
    content?: string;
    enabled?: boolean;
  }) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [title, setTitle] = useState(rule.title);
  const [content, setContent] = useState(rule.content);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (!(title.trim() && content.trim())) {
      toast.error("Title and content are required");
      return;
    }
    onUpdate({ title, content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(rule.title);
    setContent(rule.content);
    setIsEditing(false);
  };

  return (
    <Card
      className={`gap-0 transition-opacity ${rule.enabled ? "" : "opacity-60"} ${isEditing ? "" : "h-[140px]"}`}
      ref={setNodeRef}
      style={style}
    >
      {isEditing ? (
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <SettingsField label="Title">
              <Input
                disabled={isUpdating}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., General, Writing, Coding"
                value={title}
              />
            </SettingsField>
            <SettingsField label="Content">
              <Textarea
                className="min-h-24"
                disabled={isUpdating}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your custom instructions..."
                value={content}
              />
            </SettingsField>
            <div className="flex gap-2">
              <Button
                disabled={isUpdating}
                onClick={handleSave}
                size="sm"
                variant="default"
              >
                Save
              </Button>
              <Button
                disabled={isUpdating}
                onClick={handleCancel}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-0">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      {...attributes}
                      {...listeners}
                      className="flex shrink-0 cursor-grab touch-none items-center p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
                      type="button"
                    >
                      <GripVerticalIcon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Drag to reorder</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex shrink-0 items-center">
                      <Switch
                        checked={rule.enabled}
                        disabled={isUpdating}
                        onCheckedChange={(checked) =>
                          onUpdate({ enabled: checked })
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Disable rule to exclude it from the selection list
                  </TooltipContent>
                </Tooltip>
                <CardTitle className="min-w-0 truncate text-base">
                  {rule.title}
                </CardTitle>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={isUpdating}
                      onClick={() => setIsEditing(true)}
                      size="icon"
                      variant="ghost"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit rule</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isUpdating}
                      onClick={onDelete}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete rule</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col pt-0">
            <CardDescription className="line-clamp-3 text-sm">
              {rule.content}
            </CardDescription>
          </CardContent>
        </>
      )}
    </Card>
  );
};

/**
 * AI Rules settings section
 */
export const AiRulesSection = () => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleContent, setNewRuleContent] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Fetch user rules
   */
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["userRules"],
    queryFn: () => rpcClient.userRules.list(),
  });

  /**
   * Create rule mutation
   */
  const createRuleMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) =>
      await rpcClient.userRules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRules"] });
      setIsCreating(false);
      setNewRuleTitle("");
      setNewRuleContent("");
      toast.success("Rule created successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create rule"
      );
    },
  });

  /**
   * Update rule mutation
   */
  const updateRuleMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      content?: string;
      enabled?: boolean;
    }) => await rpcClient.userRules.update({ id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRules"] });
      toast.success("Rule updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update rule"
      );
    },
  });

  /**
   * Delete rule mutation
   */
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await rpcClient.userRules.delete({ id });
      if (!result.success) {
        throw new Error("Failed to delete rule");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRules"] });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      toast.success("Rule deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rule"
      );
    },
  });

  /**
   * Reorder rules mutation
   */
  const reorderRulesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) =>
      await rpcClient.userRules.reorder({ orderedIds }),
    onMutate: async (orderedIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["userRules"] });

      // Snapshot previous value
      const previousRules = queryClient.getQueryData(["userRules"]);

      // Optimistically update cache
      queryClient.setQueryData(["userRules"], (old: typeof rules) => {
        if (!old) {
          return old;
        }
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
        return [...old].sort(
          (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
        );
      });

      return { previousRules };
    },
    onError: (error, _orderedIds, context) => {
      // Rollback on error
      if (context?.previousRules) {
        queryClient.setQueryData(["userRules"], context.previousRules);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder rules"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userRules"] });
    },
  });

  /**
   * Handle create new rule
   */
  const handleCreateRule = () => {
    if (!(newRuleTitle.trim() && newRuleContent.trim())) {
      toast.error("Title and content are required");
      return;
    }
    createRuleMutation.mutate({
      title: newRuleTitle.trim(),
      content: newRuleContent.trim(),
    });
  };

  /**
   * Handle delete rule
   */
  const handleDeleteRule = () => {
    if (ruleToDelete) {
      deleteRuleMutation.mutate(ruleToDelete);
    }
  };

  /**
   * Handle drag end - reorder rules
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = rules.findIndex((rule) => rule.id === active.id);
    const newIndex = rules.findIndex((rule) => rule.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = arrayMove(rules, oldIndex, newIndex);
    const orderedIds = newOrder.map((rule) => rule.id);
    reorderRulesMutation.mutate(orderedIds);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-lg">AI Rules</h2>
          <p className="text-muted-foreground text-sm">
            Create custom instructions that will be prepended to your messages.
            You can select which rules to apply in the chat input.
          </p>
        </div>
        {rules.length > 0 && !isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <PlusIcon className="mr-2 size-4" />
            Add Rule
          </Button>
        )}
      </div>

      <Separator />

      {/* Rules list */}
      {rules.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
          <FileTextIcon className="size-12 text-muted-foreground" />
          <div className="flex flex-col gap-1 text-center">
            <p className="font-medium">No AI rules configured</p>
            <p className="text-muted-foreground text-sm">
              Add your first rule to get started
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)} size="sm">
            <PlusIcon className="mr-2 size-4" />
            Add Rule
          </Button>
        </div>
      ) : (
        <>
          {isCreating ? (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-4">
                <SettingsField label="Title">
                  <Input
                    disabled={createRuleMutation.isPending}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    placeholder="e.g., General, Writing, Coding"
                    value={newRuleTitle}
                  />
                </SettingsField>
                <SettingsField label="Content">
                  <Textarea
                    className="min-h-24"
                    disabled={createRuleMutation.isPending}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    placeholder="Enter your custom instructions..."
                    value={newRuleContent}
                  />
                </SettingsField>
                <div className="flex gap-2">
                  <Button
                    disabled={createRuleMutation.isPending}
                    onClick={handleCreateRule}
                    size="sm"
                    variant="default"
                  >
                    {createRuleMutation.isPending ? (
                      <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                    ) : null}
                    Create
                  </Button>
                  <Button
                    disabled={createRuleMutation.isPending}
                    onClick={() => {
                      setIsCreating(false);
                      setNewRuleTitle("");
                      setNewRuleContent("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {rules.length > 0 && (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={rules.map((rule) => rule.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-4">
                  {rules.map((rule) => (
                    <SortableRuleCard
                      isUpdating={updateRuleMutation.isPending}
                      key={rule.id}
                      onDelete={() => {
                        setRuleToDelete(rule.id);
                        setDeleteDialogOpen(true);
                      }}
                      onUpdate={(data) =>
                        updateRuleMutation.mutate({ id: rule.id, ...data })
                      }
                      rule={rule}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRuleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRuleMutation.isPending}
              onClick={handleDeleteRule}
            >
              {deleteRuleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
