import { GlassContainer, GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { Menu, Plus, SlidersHorizontal } from "lucide-react-native";
import { Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useChatContext } from "@/contexts/chat-context";
import { useDrawer } from "@/contexts/drawer-context";
import {
  getMemoryEnabled,
  getReasoningEffort,
  getSelectedMcpTools,
  getSelectedRuleIds,
} from "@/hooks/use-user-preferences";
import { lightTap } from "@/lib/haptics";

/**
 * Fixed header controls - menu and plus buttons grouped on top-left
 * Controls button on top-right
 * Hides when drawer is open
 */
export const HeaderControls = () => {
  const { isOpen, toggleDrawer } = useDrawer();
  const { navigateToNew } = useChatContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /**
   * Opens chat controls sheet with current preferences
   */
  const openControls = () => {
    Keyboard.dismiss();
    lightTap();
    router.push({
      pathname: "/chat-controls",
      params: {
        selectedRuleIds: JSON.stringify(getSelectedRuleIds()),
        memoryEnabled: String(getMemoryEnabled()),
        reasoningEffort: getReasoningEffort(),
        selectedMcpTools: JSON.stringify(getSelectedMcpTools()),
      },
    });
  };

  if (isOpen) {
    return null;
  }

  return (
    <>
      {/* Left side: Menu + New chat */}
      <GlassContainer
        spacing={8}
        style={{
          position: "absolute",
          top: insets.top,
          left: 8,
          zIndex: 60,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <GlassView
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <Button
            className="p-0"
            onPress={() => {
              Keyboard.dismiss();
              lightTap();
              toggleDrawer();
            }}
            size="icon"
            variant="ghost"
          >
            <Icon as={Menu} className="text-foreground" size={20} />
          </Button>
        </GlassView>
        <GlassView
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <Button
            className="p-0"
            onPress={() => {
              Keyboard.dismiss();
              lightTap();
              navigateToNew();
            }}
            size="icon"
            variant="ghost"
          >
            <Icon as={Plus} className="text-foreground" size={20} />
          </Button>
        </GlassView>
      </GlassContainer>

      {/* Right side: Controls */}
      <GlassContainer
        spacing={8}
        style={{
          position: "absolute",
          top: insets.top,
          right: 8,
          zIndex: 60,
        }}
      >
        <GlassView
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <Button
            className="p-0"
            onPress={openControls}
            size="icon"
            variant="ghost"
          >
            <Icon
              as={SlidersHorizontal}
              className="text-foreground"
              size={20}
            />
          </Button>
        </GlassView>
      </GlassContainer>
    </>
  );
};
