import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { FileQuestion } from "lucide-react";
import { useUser } from "../contexts/user-context";
import { navigate } from "../router";

/**
 * 404 Not Found page
 * Works for both authenticated and unauthenticated users
 */
export const NotFoundPage = () => {
  const { user } = useUser();

  const handleReturnHome = () => {
    const destination = user ? "/" : "/login";
    navigate(destination);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription className="text-base">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleReturnHome}>Return Home</Button>
        </CardContent>
      </Card>
    </div>
  );
};
