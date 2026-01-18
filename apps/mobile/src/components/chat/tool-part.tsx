import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getThemeColors, radius } from "@/lib/colors";

/** Dynamic tool part from DB (has toolName property) */
type DynamicToolPart = {
  type: "dynamic-tool";
  toolCallId: string;
  toolName: string;
  state: ToolUIPart["state"];
  input: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string };
};

type ToolPartProps = {
  part: ToolUIPart | DynamicToolPart;
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
  }) => void;
};

type StatusBadgeInfo = {
  label: string;
  iconColor: string;
  animate?: boolean;
};

/**
 * Gets status badge info based on tool state
 */
const getStatusBadgeInfo = (
  state: ToolUIPart["state"],
  colors: ReturnType<typeof getThemeColors>
): StatusBadgeInfo => {
  const statusMap: Record<ToolUIPart["state"], StatusBadgeInfo> = {
    "input-streaming": {
      label: "Pending",
      iconColor: colors.mutedForeground,
    },
    "input-available": {
      label: "Running",
      iconColor: colors.mutedForeground,
      animate: true,
    },
    "approval-requested": {
      label: "Awaiting Approval",
      iconColor: "#ca8a04", // yellow-600
    },
    "approval-responded": {
      label: "Responded",
      iconColor: "#2563eb", // blue-600
    },
    "output-available": {
      label: "Completed",
      iconColor: "#16a34a", // green-600
    },
    "output-error": {
      label: "Error",
      iconColor: "#dc2626", // red-600
    },
    "output-denied": {
      label: "Denied",
      iconColor: "#ea580c", // orange-600
    },
  };
  return statusMap[state];
};

/**
 * Gets the icon component for the current tool state
 */
const getStatusIcon = (state: ToolUIPart["state"]) => {
  const iconMap: Record<ToolUIPart["state"], typeof CircleIcon> = {
    "input-streaming": CircleIcon,
    "input-available": ClockIcon,
    "approval-requested": ClockIcon,
    "approval-responded": CheckCircleIcon,
    "output-available": CheckCircleIcon,
    "output-error": XCircleIcon,
    "output-denied": XCircleIcon,
  };
  return iconMap[state];
};

/**
 * Extracts tool name from part type or toolName property
 */
const getToolName = (part: ToolUIPart | DynamicToolPart): string => {
  if (part.type === "dynamic-tool") {
    return (part as DynamicToolPart).toolName;
  }
  // Extract tool name from type like "tool-search" -> "search"
  return part.type.split("-").slice(1).join("-");
};

/**
 * Renders the shimmer text with pulsing opacity animation for "Running..." state
 */
const ShimmerText = ({ children }: { children: string }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="font-medium text-muted-foreground text-xs">
        {children}
      </Text>
    </Animated.View>
  );
};

/**
 * Status badge component
 */
const StatusBadge = ({
  state,
  colors,
}: {
  state: ToolUIPart["state"];
  colors: ReturnType<typeof getThemeColors>;
}) => {
  const info = getStatusBadgeInfo(state, colors);
  const StatusIcon = getStatusIcon(state);

  return (
    <Badge className="gap-1.5" variant="outline">
      <Icon as={StatusIcon} color={info.iconColor} size={14} />
      {info.animate ? (
        <ShimmerText>{info.label}</ShimmerText>
      ) : (
        <Text className="text-foreground text-xs">{info.label}</Text>
      )}
    </Badge>
  );
};

/**
 * Renders tool input as formatted JSON
 */
const ToolInput = ({ input }: { input: unknown }) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);

  return (
    <View style={styles.inputSection}>
      <Text className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Parameters
      </Text>
      <View style={[styles.codeBlock, { backgroundColor: theme.muted }]}>
        <Text className="font-mono text-foreground text-xs">
          {JSON.stringify(input, null, 2)}
        </Text>
      </View>
    </View>
  );
};

/**
 * Renders tool output or error
 */
const ToolOutput = ({
  output,
  errorText,
  state,
}: {
  output: unknown;
  errorText?: string;
  state: ToolUIPart["state"];
}) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);

  const isError = state === "output-error" || errorText !== undefined;
  const isDenied = state === "output-denied";

  if (!(output || errorText || isDenied)) {
    return null;
  }

  const backgroundColor = isError
    ? "rgba(220, 38, 38, 0.1)" // red-600 with 10% opacity
    : theme.muted;

  const getHeaderText = () => {
    if (isError) {
      return "Error";
    }
    if (isDenied) {
      return "Denied";
    }
    return "Result";
  };

  const renderContent = () => {
    if (errorText) {
      return (
        <Text className="font-mono text-destructive text-xs">{errorText}</Text>
      );
    }
    if (isDenied) {
      return (
        <Text className="font-mono text-orange-600 text-xs">
          Tool execution was denied by user.
        </Text>
      );
    }
    return (
      <Text className="font-mono text-foreground text-xs">
        {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
      </Text>
    );
  };

  return (
    <View style={[styles.outputSection, { borderTopColor: theme.border }]}>
      <Text className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {getHeaderText()}
      </Text>
      <View style={[styles.codeBlock, { backgroundColor }]}>
        {renderContent()}
      </View>
    </View>
  );
};

/**
 * Renders approval buttons when tool requires user approval
 */
const ToolApproval = ({
  approvalId,
  addToolApprovalResponse,
}: {
  approvalId: string;
  addToolApprovalResponse: (response: {
    id: string;
    approved: boolean;
  }) => void;
}) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);

  return (
    <View style={[styles.approvalSection, { borderTopColor: theme.border }]}>
      <Text className="text-muted-foreground text-sm">
        This tool requires your approval to execute.
      </Text>
      <View style={styles.approvalButtons}>
        <Button
          onPress={() =>
            addToolApprovalResponse({ id: approvalId, approved: true })
          }
          size="sm"
          variant="default"
        >
          <Text>Approve</Text>
        </Button>
        <Button
          onPress={() =>
            addToolApprovalResponse({ id: approvalId, approved: false })
          }
          size="sm"
          variant="outline"
        >
          <Text>Deny</Text>
        </Button>
      </View>
    </View>
  );
};

/**
 * Renders a tool invocation part with collapsible accordion
 * Shows tool name, status badge, input parameters, and output/error
 * Auto-expands when approval is requested
 */
export const ToolPart = ({ part, addToolApprovalResponse }: ToolPartProps) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);

  const toolName = getToolName(part);
  const needsApproval = part.state === "approval-requested";
  const showOutput =
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied";

  // Get approval ID from part
  let approvalId: string | undefined;
  if (
    needsApproval &&
    "approval" in part &&
    part.approval &&
    typeof part.approval === "object" &&
    "id" in part.approval
  ) {
    approvalId = (part.approval as { id: string }).id;
  }

  // Track accordion open state - expanded when approval requested
  const [accordionValue, setAccordionValue] = useState<string>(
    needsApproval ? "tool" : ""
  );

  // Auto-expand when approval is requested
  useEffect(() => {
    if (needsApproval) {
      setAccordionValue("tool");
    }
  }, [needsApproval]);

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <Accordion
        collapsible
        onValueChange={(value) =>
          setAccordionValue((value as string | undefined) ?? "")
        }
        type="single"
        value={accordionValue}
      >
        <AccordionItem className="border-b-0" value="tool">
          <AccordionTrigger className="py-2">
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Icon as={WrenchIcon} color={theme.mutedForeground} size={16} />
                <Text className="font-medium text-foreground text-sm">
                  {toolName}
                </Text>
              </View>
              <StatusBadge colors={theme} state={part.state} />
            </View>
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <View style={styles.content}>
              <ToolInput input={part.input} />
              {needsApproval &&
                addToolApprovalResponse !== undefined &&
                approvalId !== undefined && (
                  <ToolApproval
                    addToolApprovalResponse={addToolApprovalResponse}
                    approvalId={approvalId}
                  />
                )}
              {showOutput ? (
                <ToolOutput
                  errorText={
                    part.state === "output-error"
                      ? (part as ToolUIPart).errorText
                      : undefined
                  }
                  output={
                    part.state === "output-available"
                      ? (part as ToolUIPart).output
                      : undefined
                  }
                  state={part.state}
                />
              ) : null}
            </View>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  content: {
    paddingTop: 4,
  },
  inputSection: {
    gap: 8,
  },
  codeBlock: {
    borderRadius: radius.sm,
    padding: 12,
  },
  outputSection: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  approvalSection: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  approvalButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
