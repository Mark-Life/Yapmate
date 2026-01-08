/**
 * Checkout success page - fallback handler for edge cases
 * Handles redirect from Stripe checkout when onComplete callback fails
 */

import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { navigate } from "../router";

type Status = "loading" | "success" | "error";

/**
 * Checkout success page component
 * Links Stripe customer ID to user account and redirects on success
 * This is a fallback for edge cases when the in-drawer onComplete callback fails
 */
export const CheckoutSuccessPage = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCheckout = async () => {
      // Extract session_id from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");

      if (!sessionId) {
        setErrorMessage(
          "Missing session ID. Please contact support if this issue persists."
        );
        setStatus("error");
        return;
      }

      try {
        // Call API to link customer ID to user account
        const response = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to complete subscription setup"
          );
        }

        // Success - redirect to home
        // Subscription data will refresh automatically when user navigates back
        setStatus("success");

        // Redirect to home after a brief delay
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } catch (err) {
        console.error("Failed to link customer:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to complete subscription setup. Please contact support."
        );
        setStatus("error");
      }
    };

    processCheckout();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <CardTitle>Completing your subscription...</CardTitle>
            <CardDescription>
              Please wait while we set up your account
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Subscription Activated!</CardTitle>
            <CardDescription>
              Your subscription has been successfully set up. Redirecting you...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <CardTitle>Setup Error</CardTitle>
          <CardDescription className="text-destructive">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => {
              navigate("/");
            }}
          >
            Go to Home
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              window.location.reload();
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
