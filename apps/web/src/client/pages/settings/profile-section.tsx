import { Button } from "@yapmate/components/ui/button";
import { Input } from "@yapmate/components/ui/input";
import { Label } from "@yapmate/components/ui/label";
import { Separator } from "@yapmate/components/ui/separator";
import { Switch } from "@yapmate/components/ui/switch";
import { useUser } from "../../contexts/user-context";

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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
            <Button
              className="mt-2 w-fit"
              disabled
              size="sm"
              variant="destructive"
            >
              Delete account
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
