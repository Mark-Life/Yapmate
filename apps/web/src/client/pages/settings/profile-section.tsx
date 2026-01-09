import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@yapmate/components/ui/input";
import { Label } from "@yapmate/components/ui/label";
import { Separator } from "@yapmate/components/ui/separator";
import { Switch } from "@yapmate/components/ui/switch";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../contexts/user-context";
import { rpcClient } from "../../lib/rpc-client";
import { createClient } from "../../lib/supabase/client";
import { navigate } from "../../router";

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
  children: ReactNode;
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
 * Settings row with label on left and control on right
 */
const SettingsRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4">
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
 * Section wrapper with title
 */
const SettingsSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-4">
    <h2 className="font-semibold text-lg">{title}</h2>
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

/**
 * Profile settings section
 * Contains email, privacy, password, and account deletion settings
 */
export const ProfileSection = () => {
  const { user } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState("");

  /**
   * Delete account mutation
   */
  const deleteAccountMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await rpcClient.auth.deleteAccount({ email });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete account");
      }
    },
    onSuccess: async () => {
      // Sign out user
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });

      // Show success message
      toast.success("Account deleted successfully");

      // Redirect to /about
      navigate("/about");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    },
  });

  /**
   * Handles delete account confirmation
   */
  const handleDeleteAccount = () => {
    if (!user?.email) {
      toast.error("User email not available");
      return;
    }

    if (emailConfirmation !== user.email) {
      toast.error("Email does not match");
      return;
    }

    deleteAccountMutation.mutate(emailConfirmation);
  };

  const isEmailMatch = emailConfirmation === user?.email;
  const isDeleting = deleteAccountMutation.isPending;

  return (
    <div className="flex flex-col gap-8">
      {/* Account section */}
      <SettingsSection title="Account">
        <SettingsField
          description="Your email address for account communications"
          label="Email"
        >
          <div className="flex gap-2">
            <Input
              className="max-w-xs"
              defaultValue={user?.email ?? ""}
              disabled
              placeholder="email@example.com"
              type="email"
            />
            <Button disabled variant="outline">
              Change
            </Button>
          </div>
        </SettingsField>

        <SettingsField
          description="Update your password to keep your account secure"
          label="Password"
        >
          <Button className="w-fit" disabled variant="outline">
            Change password
          </Button>
        </SettingsField>
      </SettingsSection>

      <Separator />

      {/* Privacy section */}
      <SettingsSection title="Privacy">
        <SettingsRow
          description="Hide your email address from being displayed in the app"
          label="Hide email in UI"
        >
          <Switch disabled />
        </SettingsRow>
      </SettingsSection>

      <Separator />

      {/* Danger zone */}
      <SettingsSection title="Danger Zone">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-destructive text-sm">
              Delete Account
            </h3>
            <p className="text-muted-foreground text-xs">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <p className="text-muted-foreground text-xs">
              If you have purchased a subscription, we will delete all database
              records regarding your user info, chats, and messages, but will
              keep purchase data (receipts and invoices) for bookkeeping that is
              required by law.
            </p>
            <Button
              className="mt-2 w-fit"
              onClick={() => setDeleteDialogOpen(true)}
              size="sm"
              variant="destructive"
            >
              Delete account
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Delete account confirmation dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and all associated data (chats, messages, files).
              <br />
              <br />
              If you have purchased a subscription, purchase records (receipts
              and invoices) will be preserved for legal bookkeeping purposes.
              <br />
              <br />
              To confirm, please type your email address:{" "}
              <strong>{user?.email}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-confirmation">Email</Label>
              <Input
                id="email-confirmation"
                onChange={(e) => setEmailConfirmation(e.target.value)}
                placeholder={user?.email ?? ""}
                type="email"
                value={emailConfirmation}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!isEmailMatch || isDeleting}
              onClick={handleDeleteAccount}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
