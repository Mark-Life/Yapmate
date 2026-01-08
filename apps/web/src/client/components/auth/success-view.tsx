import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { CheckCircle2 } from "lucide-react";

type SuccessViewProps = {
  email: string;
  onEnterCode: () => void;
  onUseDifferentEmail: () => void;
};

/**
 * Success view component shown after magic link is sent
 */
export const SuccessView = ({
  email,
  onEnterCode,
  onUseDifferentEmail,
}: SuccessViewProps) => (
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
          onClick={onEnterCode}
          variant="ghost"
        >
          Enter code instead
        </Button>
        <Button
          className="text-muted-foreground"
          onClick={onUseDifferentEmail}
          variant="ghost"
        >
          Use a different email
        </Button>
      </CardContent>
    </Card>
  </div>
);
