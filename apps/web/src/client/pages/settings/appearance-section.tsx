import { Label } from "@yapmate/components/ui/label";
import { Switch } from "@yapmate/components/ui/switch";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../contexts/user-context";

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
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
 * Appearance settings section
 * Contains font style preferences for AI messages
 */
export const AppearanceSection = () => {
  const { user, updateUseSerifFont } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleSerifFont = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await updateUseSerifFont(checked);
      toast.success(
        checked
          ? "AI messages will use serif font"
          : "AI messages will use sans-serif font"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update setting"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const useSerifFont = user?.useSerifFont ?? true;

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection title="Appearance">
        <SettingsRow
          description="Use a serif typeface for AI assistant messages"
          label="Serif font for AI messages"
        >
          <Switch
            checked={useSerifFont}
            disabled={isUpdating}
            onCheckedChange={handleToggleSerifFont}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
