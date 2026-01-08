import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { Mail } from "lucide-react";

type EmailConfirmationViewProps = {
  email: string;
  onBackToSignIn: () => void;
};

/**
 * Email confirmation required view component
 * Shown after password signup when email confirmation is required
 */
export const EmailConfirmationView = ({
  email,
  onBackToSignIn,
}: EmailConfirmationViewProps) => (
  <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Confirm your email</CardTitle>
        <CardDescription className="text-base">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground text-sm">
          Please check your inbox and click the link to verify your email
          address. After confirming, you can sign in with your password.
        </p>
        <Button
          className="text-muted-foreground"
          onClick={onBackToSignIn}
          variant="ghost"
        >
          Back to sign in
        </Button>
      </CardContent>
    </Card>
  </div>
);
