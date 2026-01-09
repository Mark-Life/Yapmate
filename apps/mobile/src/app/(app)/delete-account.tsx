import { useMutation } from "@tanstack/react-query";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";
import { useUser } from "@/contexts/user-context";
import { lightTap } from "@/lib/haptics";
import { rpcClient } from "@/lib/rpc-client";

/**
 * Delete account confirmation screen presented as formSheet
 * Requires email confirmation before deletion
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut, session } = useSession();
  const { user } = useUser();
  const [emailConfirmation, setEmailConfirmation] = useState("");

  const userEmail = session?.user?.email ?? "";
  const hideEmailInUi = user?.hideEmailInUi ?? false;
  const isEmailMatch = emailConfirmation === userEmail;

  /**
   * Delete account mutation
   */
  const deleteAccountMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await rpcClient.auth.deleteAccount({ email });
      if (!result.success) {
        throw new Error(
          result.error ??
            "Failed to delete account, contact support: support@mark-life.com"
        );
      }
    },
    onSuccess: async () => {
      await signOut();
      router.push("/");
    },
  });

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = () => {
    if (!isEmailMatch) {
      return;
    }
    lightTap();
    deleteAccountMutation.mutate(emailConfirmation);
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    lightTap();
    router.back();
  };

  const isDeleting = deleteAccountMutation.isPending;

  return (
    <View className="flex-1" style={{ paddingTop: 16 }}>
      <View className="flex-1 p-4">
        <GlassContainer
          spacing={8}
          style={{ borderRadius: 24, padding: 16, gap: 16 }}
        >
          <View className="gap-2">
            <Text className="font-semibold text-destructive text-lg">
              Delete Account
            </Text>
            <Text className="text-muted-foreground text-sm">
              This action cannot be undone. This will permanently delete your
              account and all associated data (chats, messages, files).
            </Text>
            <Text className="text-muted-foreground text-sm">
              If you have purchased a subscription, purchase records (receipts
              and invoices) will be preserved for legal bookkeeping purposes.
            </Text>
          </View>

          {/* Email confirmation input */}
          <View className="gap-2">
            <Text className="text-muted-foreground text-sm">
              To confirm, please type your email address:{" "}
              <Text
                className={`font-semibold text-foreground ${hideEmailInUi ? "blur-sm" : ""}`}
              >
                {userEmail}
              </Text>
            </Text>
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 32,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <Input
                autoCapitalize="none"
                autoComplete="email"
                className={`rounded-full border-input bg-muted ${hideEmailInUi ? "blur-sm" : ""}`}
                keyboardType="email-address"
                onChangeText={setEmailConfirmation}
                placeholder={userEmail}
                value={emailConfirmation}
              />
            </GlassView>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 32,
                padding: 0,
                overflow: "hidden",
                flex: 1,
              }}
            >
              <Button
                className="flex-1 rounded-full bg-muted"
                disabled={isDeleting}
                onPress={handleCancel}
                variant="outline"
              >
                <Text>Cancel</Text>
              </Button>
            </GlassView>
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 32,
                padding: 0,
                overflow: "hidden",
                flex: 1,
              }}
              tintColor="#ef4444"
            >
              <Button
                className="flex-1 rounded-full"
                disabled={!isEmailMatch || isDeleting}
                onPress={handleDeleteConfirm}
                variant="destructive"
              >
                <Text>{isDeleting ? "Deleting..." : "Delete"}</Text>
              </Button>
            </GlassView>
          </View>
        </GlassContainer>
      </View>
    </View>
  );
}
