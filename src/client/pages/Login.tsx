import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithMagicLink } from "../lib/auth";

type State = "idle" | "loading" | "success" | "error";

/**
 * Login page with magic link authentication
 */
export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }

    setIsPending(true);
    setState("loading");
    setError(null);

    const result = await signInWithMagicLink(email);

    if (result.success) {
      setState("success");
    } else {
      setState("error");
      setError(result.error);
    }
    setIsPending(false);
  };

  // Success state - show confirmation
  if (state === "success") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a link to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              Click the link in your email to sign in. <br />
              The link expires in 1 hour.
            </p>
            <Button
              className="text-muted-foreground"
              onClick={() => {
                setState("idle");
                setEmail("");
              }}
              variant="ghost"
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default state - login form
  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Login or sign up</CardTitle>
          <CardDescription>
            Enter your email to receive a link to login or sign up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Input
                autoComplete="email"
                autoFocus
                disabled={isPending}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
            </div>
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send login link"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

