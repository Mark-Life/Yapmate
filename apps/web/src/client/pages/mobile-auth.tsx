import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { AlertCircle, Loader2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { navigate } from "../router";

/**
 * Mobile auth callback page
 * Handles magic link authentication redirects from mobile app
 */
export const MobileAuthPage = () => {
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenHash = urlParams.get("token_hash");
    const type = urlParams.get("type");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    // Handle error case
    if (error) {
      setErrorMessage(
        errorDescription || error || "An error occurred during authentication"
      );
      setStatus("error");
      return;
    }

    // Validate required parameters
    if (!(tokenHash && type)) {
      setErrorMessage("Missing verification parameters");
      setStatus("error");
      return;
    }

    // Build deep link URL
    // Try to detect scheme from user agent or default to production
    const scheme = "yapmate"; // Could be enhanced to detect dev/preview
    const deepLink = `${scheme}://auth/callback?token_hash=${encodeURIComponent(
      tokenHash
    )}&type=${encodeURIComponent(type)}`;

    setDeepLinkUrl(deepLink);
    setStatus("redirecting");

    // Don't auto-redirect - let universal links handle it naturally
    // If universal links are configured, iOS will intercept the https:// URL
    // If not, the user can tap the button to open via deep link
    // Auto-redirecting breaks Safari when universal links aren't working
  }, []);

  const handleGoToLogin = () => {
    navigate("/login");
  };

  if (status === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription className="text-base">
              {errorMessage}
            </CardDescription>
            <CardDescription className="mt-2 text-sm">
              If you don't have the Yapmate app installed, please download it
              from the App Store.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <a
                href="https://apps.apple.com/app/yapmate"
                rel="noopener noreferrer"
                target="_blank"
              >
                Download from App Store
              </a>
            </Button>
            <Button
              className="w-full"
              onClick={handleGoToLogin}
              variant="outline"
            >
              Go to Web App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Opening Yapmate...</CardTitle>
          <CardDescription className="text-base">
            If the app doesn't open automatically, tap the link below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {deepLinkUrl !== null ? (
            <Button asChild className="w-full">
              <a href={deepLinkUrl}>
                <Smartphone className="mr-2 size-4" />
                Open in Yapmate App
              </a>
            </Button>
          ) : null}
          <Button asChild className="w-full" variant="outline">
            <a
              href="https://apps.apple.com/app/yapmate"
              rel="noopener noreferrer"
              target="_blank"
            >
              Download from App Store
            </a>
          </Button>
          <Button className="w-full" onClick={handleGoToLogin} variant="ghost">
            Go to Web App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
