/**
 * Add/Edit MCP Server dialog component
 * Handles creating and updating MCP server configurations with connection testing
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
import { Input } from "@yapmate/components/ui/input";
import { Label } from "@yapmate/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@yapmate/components/ui/radio-group";
import { Separator } from "@yapmate/components/ui/separator";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { rpcClient } from "../../lib/rpc-client";

type McpServerFormData = {
  name: string;
  url: string;
  transportType: "http" | "sse";
  authType: "bearer" | "api-key" | "none";
  authHeaderName: string;
  apiKey: string;
};

type McpServerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingServer: {
    id: string;
    name: string;
    url: string;
    transportType: "http" | "sse";
    authType: "bearer" | "api-key" | "none";
    authHeaderName?: string | null;
  } | null;
};

/**
 * Test connection result display component
 */
const TestResultDisplay = ({
  result,
}: {
  result: {
    success: boolean;
    error?: string;
    toolCount?: number;
    tools?: Array<{ name: string; description?: string }>;
  };
}) => {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 ${
        result.success
          ? "border-green-500/50 bg-green-500/10"
          : "border-destructive/50 bg-destructive/10"
      }`}
    >
      {result.success ? (
        <CheckCircle2Icon className="mt-0.5 size-5 text-green-600 dark:text-green-400" />
      ) : (
        <XCircleIcon className="mt-0.5 size-5 text-destructive" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <p
          className={`font-medium text-sm ${
            result.success
              ? "text-green-700 dark:text-green-300"
              : "text-destructive"
          }`}
        >
          {result.success ? "Connection successful!" : "Connection failed"}
        </p>
        {result.success && result.toolCount !== undefined ? (
          <p className="text-muted-foreground text-xs">
            Found {result.toolCount} tool
            {result.toolCount !== 1 ? "s" : ""}
          </p>
        ) : null}
        {result.error ? (
          <p className="text-muted-foreground text-xs">{result.error}</p>
        ) : null}
        {result.tools && result.tools.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="font-medium text-muted-foreground text-xs">
              Available tools:
            </p>
            <ul className="ml-4 list-disc text-muted-foreground text-xs">
              {result.tools.slice(0, 5).map((tool) => (
                <li key={tool.name}>
                  <span className="font-medium">{tool.name}</span>
                  {tool.description ? ` - ${tool.description}` : ""}
                </li>
              ))}
              {result.tools.length > 5 ? (
                <li className="text-muted-foreground">
                  ...and {result.tools.length - 5} more
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Add/Edit MCP Server dialog
 */
export const McpServerDialog = ({
  open,
  onClose,
  onSuccess,
  editingServer,
}: McpServerDialogProps) => {
  const [formData, setFormData] = useState<McpServerFormData>({
    name: "",
    url: "",
    transportType: "http",
    authType: "none",
    authHeaderName: "Authorization",
    apiKey: "",
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    toolCount?: number;
    tools?: Array<{ name: string; description?: string }>;
  } | null>(null);

  /**
   * Reset form when dialog opens/closes or editing server changes
   */
  useEffect(() => {
    if (open) {
      if (editingServer) {
        setFormData({
          name: editingServer.name,
          url: editingServer.url,
          transportType: editingServer.transportType,
          authType: editingServer.authType,
          authHeaderName: editingServer.authHeaderName ?? "Authorization",
          apiKey: "", // Never show existing API key
        });
      } else {
        setFormData({
          name: "",
          url: "",
          transportType: "http",
          authType: "none",
          authHeaderName: "Authorization",
          apiKey: "",
        });
      }
      setTestResult(null);
    }
  }, [open, editingServer]);

  /**
   * Test connection mutation
   */
  const testMutation = useMutation({
    mutationFn: async (data: McpServerFormData) =>
      await rpcClient.mcp.servers.test({
        url: data.url,
        transportType: data.transportType,
        authType: data.authType,
        authHeaderName:
          data.authType !== "none" ? data.authHeaderName : undefined,
        apiKey: data.authType !== "none" ? data.apiKey : undefined,
      }),
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(
          `Connection successful! Found ${result.toolCount ?? 0} tools.`
        );
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      });
      toast.error("Failed to test connection");
    },
  });

  /**
   * Create/Update server mutation
   */
  const saveMutation = useMutation({
    mutationFn: async (data: McpServerFormData) => {
      if (editingServer) {
        return await rpcClient.mcp.servers.update({
          id: editingServer.id,
          name: data.name,
          url: data.url,
          transportType: data.transportType,
          authType: data.authType,
          authHeaderName:
            data.authType !== "none" ? data.authHeaderName : undefined,
          apiKey: data.authType !== "none" ? data.apiKey : undefined,
        });
      }
      return await rpcClient.mcp.servers.create({
        name: data.name,
        url: data.url,
        transportType: data.transportType,
        authType: data.authType,
        authHeaderName:
          data.authType !== "none" ? data.authHeaderName : undefined,
        apiKey: data.authType !== "none" ? data.apiKey : undefined,
      });
    },
    onSuccess: () => {
      toast.success(
        editingServer
          ? "Server updated successfully"
          : "Server created successfully"
      );
      onSuccess();
    },
    onError: (error) => {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (editingServer) {
        errorMessage = "Failed to update server";
      } else {
        errorMessage = "Failed to create server";
      }
      toast.error(errorMessage);
    },
  });

  /**
   * Handle form field changes
   */
  const handleFieldChange = (
    field: keyof McpServerFormData,
    value: string | "http" | "sse" | "bearer" | "api-key" | "none"
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null);
    }
  };

  /**
   * Handle test connection
   */
  const handleTestConnection = () => {
    if (!formData.url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    testMutation.mutate(formData);
  };

  /**
   * Validate and show errors for form fields
   */
  const validateAndShowErrors = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return false;
    }
    if (!formData.url.trim()) {
      toast.error("Please enter a URL");
      return false;
    }
    if (formData.authType !== "none" && !formData.apiKey.trim()) {
      toast.error("Please enter an API key");
      return false;
    }
    if (formData.authType === "api-key" && !formData.authHeaderName.trim()) {
      toast.error("Please enter an auth header name");
      return false;
    }
    return true;
  };

  /**
   * Handle form submit
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAndShowErrors()) {
      saveMutation.mutate(formData);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (data: McpServerFormData): boolean => {
    if (data.name.trim() === "" || data.url.trim() === "") {
      return false;
    }
    if (data.authType === "none") {
      return true;
    }
    if (data.apiKey.trim() === "") {
      return false;
    }
    if (data.authType === "api-key" && data.authHeaderName.trim() === "") {
      return false;
    }
    return true;
  };

  const isFormValid = validateForm(formData);
  const isTesting = testMutation.isPending;
  const isSaving = saveMutation.isPending;

  // Button text based on state
  const buttonText = editingServer ? "Update" : "Create";
  const buttonLoadingText = editingServer ? "Updating..." : "Creating...";

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingServer ? "Edit MCP Server" : "Add MCP Server"}
          </DialogTitle>
          <DialogDescription>
            Configure a Model Context Protocol server to access its tools and
            capabilities
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="e.g., Context7"
              value={formData.name}
            />
            <p className="text-muted-foreground text-xs">
              A friendly name to identify this server
            </p>
          </div>

          {/* URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              onChange={(e) => handleFieldChange("url", e.target.value)}
              placeholder="https://mcp.example.com/mcp"
              type="url"
              value={formData.url}
            />
            <p className="text-muted-foreground text-xs">
              The base URL of the MCP server endpoint
            </p>
          </div>

          {/* Transport Type */}
          <div className="flex flex-col gap-2">
            <Label>Transport</Label>
            <RadioGroup
              onValueChange={(value) =>
                handleFieldChange("transportType", value as "http" | "sse")
              }
              value={formData.transportType}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="transport-http" value="http" />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="transport-http"
                >
                  HTTP
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="transport-sse" value="sse" />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="transport-sse"
                >
                  SSE (Server-Sent Events)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-muted-foreground text-xs">
              Choose the transport protocol for connecting to the server
            </p>
          </div>

          <Separator />

          {/* Authentication Type */}
          <div className="flex flex-col gap-2">
            <Label>Authentication</Label>
            <RadioGroup
              onValueChange={(value) =>
                handleFieldChange(
                  "authType",
                  value as "bearer" | "api-key" | "none"
                )
              }
              value={formData.authType}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="auth-none" value="none" />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="auth-none"
                >
                  None
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="auth-bearer" value="bearer" />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="auth-bearer"
                >
                  Bearer Token
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="auth-api-key" value="api-key" />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="auth-api-key"
                >
                  API Key Header
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auth Header Name (for API Key) */}
          {formData.authType === "api-key" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="authHeaderName">
                Auth Header Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="authHeaderName"
                onChange={(e) =>
                  handleFieldChange("authHeaderName", e.target.value)
                }
                placeholder="X-API-Key"
                value={formData.authHeaderName}
              />
              <p className="text-muted-foreground text-xs">
                The HTTP header name for the API key (e.g., X-API-Key)
              </p>
            </div>
          )}

          {/* API Key */}
          {formData.authType !== "none" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">
                {formData.authType === "bearer" ? "Bearer Token" : "API Key"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apiKey"
                onChange={(e) => handleFieldChange("apiKey", e.target.value)}
                placeholder={
                  formData.authType === "bearer"
                    ? "Enter bearer token"
                    : "Enter API key"
                }
                type="password"
                value={formData.apiKey}
              />
              {editingServer ? (
                <p className="text-muted-foreground text-xs">
                  Leave blank to keep existing API key
                </p>
              ) : null}
            </div>
          )}

          {/* Test Connection Result */}
          {testResult ? <TestResultDisplay result={testResult} /> : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              disabled={isTesting || isSaving || !formData.url.trim()}
              onClick={handleTestConnection}
              type="button"
              variant="outline"
            >
              {isTesting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <div className="flex flex-1 gap-2 sm:flex-initial sm:justify-end">
              <Button
                disabled={isSaving}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!isFormValid || isSaving} type="submit">
                {isSaving ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    {buttonLoadingText}
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
