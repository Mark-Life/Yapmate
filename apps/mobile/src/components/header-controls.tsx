import { GlassContainer, GlassView } from "expo-glass-effect";
import { Menu, Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useChatContext } from "@/contexts/chat-context";
import { useDrawer } from "@/contexts/drawer-context";

/**
 * Fixed header controls - menu and plus buttons grouped on top-left
 * Similar to desktop version, positioned absolutely
 * Hides when drawer is open
 */
export const HeaderControls = () => {
  const { isOpen, toggleDrawer } = useDrawer();
  const { navigateToNew } = useChatContext();

  if (isOpen) {
    return null;
  }

  return (
    <GlassContainer
      spacing={8}
      style={{
        position: "absolute",
        top: 4,
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
          onPress={toggleDrawer}
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
          onPress={navigateToNew}
          size="icon"
          variant="ghost"
        >
          <Icon as={Plus} className="text-foreground" size={20} />
        </Button>
      </GlassView>
    </GlassContainer>
  );
};
