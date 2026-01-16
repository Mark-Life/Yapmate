"use client";

import { cn } from "@yapmate/components/lib/utils";
import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { Badge } from "@yapmate/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@yapmate/components/ui/collapsible";
import { CodeBlock } from "./code-block";
import { GenerativeUIRenderer } from "./generative-ui";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="outline">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

/** Type guard for generative-ui tool output */
const isGenerativeUIOutput = (
  output: unknown
): output is { type: "generative-ui"; ui: { root: string; elements: Record<string, unknown> } } =>
  typeof output === "object" &&
  output !== null &&
  "type" in output &&
  (output as { type: unknown }).type === "generative-ui" &&
  "ui" in output &&
  typeof (output as { ui: unknown }).ui === "object";

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const isGenUI = isGenerativeUIOutput(output);
  console.log("[ToolOutput]", { output, errorText, isGenerativeUI: isGenUI });

  // Deep debug for generative UI
  if (isGenUI) {
    const uiOutput = output as { type: string; ui: { root: string; elements: unknown } };
    console.log("[ToolOutput] Generative UI details:", {
      root: uiOutput.ui?.root,
      elementsType: Array.isArray(uiOutput.ui?.elements) ? "array" : typeof uiOutput.ui?.elements,
      elementsKeys: uiOutput.ui?.elements && typeof uiOutput.ui.elements === "object" && !Array.isArray(uiOutput.ui.elements)
        ? Object.keys(uiOutput.ui.elements)
        : "N/A (not an object)",
      elementsLength: Array.isArray(uiOutput.ui?.elements) ? uiOutput.ui.elements.length : "N/A",
      rawElements: JSON.stringify(uiOutput.ui?.elements, null, 2),
    });
  }

  if (!(output || errorText)) {
    return null;
  }

  // Handle generative-ui output specially
  if (isGenUI) {
    return (
      <div className={cn("p-4", className)} {...props}>
        <GenerativeUIRenderer tree={(output as { ui: unknown }).ui as Parameters<typeof GenerativeUIRenderer>[0]["tree"]} />
      </div>
    );
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
