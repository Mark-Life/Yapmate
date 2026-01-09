import { Host, Switch } from "@expo/ui/swift-ui";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUser } from "@/contexts/user-context";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import { lightTap } from "@/lib/haptics";

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
  <View className="flex-row items-center justify-between gap-4">
    <View className="flex-1 flex-col gap-0.5">
      <Text className="font-medium text-foreground text-sm">{label}</Text>
      {description ? (
        <Text className="text-muted-foreground text-xs">{description}</Text>
      ) : null}
    </View>
    {children}
  </View>
);

/**
 * Settings screen presented as formSheet
 * Contains privacy settings and account management
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateHideEmailInUi } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const { capture } = useAnalytics();

  const hideEmailInUi = user?.hideEmailInUi ?? false;

  /**
   * Handles hide email toggle
   */
  const handleToggleHideEmail = async (checked: boolean) => {
    lightTap();
    capture(AnalyticsEvents.HIDE_EMAIL_TOGGLED, { enabled: checked });
    setIsUpdating(true);
    try {
      await updateHideEmailInUi(checked);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Navigate to delete account confirmation
   */
  const handleDeleteAccount = () => {
    lightTap();
    capture(AnalyticsEvents.DELETE_ACCOUNT_INITIATED);
    router.push("/delete-account");
  };

  return (
    <View className="flex-1" style={{ paddingTop: 16 }}>
      <View className="flex-1 gap-4 p-4">
        {/* Privacy section */}
        <GlassContainer
          spacing={8}
          style={{ borderRadius: 24, padding: 16, gap: 16 }}
        >
          <Text className="font-semibold text-base text-foreground">
            Privacy
          </Text>
          <SettingsRow
            description="Hide your email address from being displayed in the app"
            label="Hide email in UI"
          >
            <Host matchContents>
              <Switch
                onValueChange={isUpdating ? undefined : handleToggleHideEmail}
                value={hideEmailInUi}
                variant="switch"
              />
            </Host>
          </SettingsRow>
        </GlassContainer>

        {/* Danger zone */}
        <GlassContainer
          spacing={8}
          style={{ borderRadius: 24, padding: 16, gap: 12 }}
          // tintColor="#ef4444"
        >
          <Text className="font-semibold text-base text-destructive">
            Danger Zone
          </Text>
          <View className="gap-2">
            <Text className="text-muted-foreground text-xs">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </Text>
          </View>
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
              alignSelf: "flex-start",
            }}
            tintColor="#ef4444"
          >
            <Button
              className="gap-2 rounded-full"
              onPress={handleDeleteAccount}
              variant="destructive"
            >
              <Icon
                as={Trash2}
                className="text-destructive-foreground"
                size={16}
              />
              <Text>Delete account</Text>
            </Button>
          </GlassView>
        </GlassContainer>
      </View>
    </View>
  );
}
