import { Menu } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useDrawer } from "@/contexts/drawer-context";

/**
 * Fixed header controls - menu button in top-left corner
 * Similar to desktop version, positioned absolutely
 * Hides when drawer is open
 */
export const HeaderControls = () => {
  const { isOpen, toggleDrawer } = useDrawer();
  const { colorScheme } = useColorScheme();

  if (isOpen) {
    return null;
  }

  return (
    <View
      className={`absolute top-2 left-2 z-[60] rounded-lg ${
        colorScheme === "dark" ? "bg-black/80" : "bg-white/80"
      }`}
    >
      <Button onPress={toggleDrawer} size="icon" variant="ghost">
        <Icon as={Menu} size={20} />
      </Button>
    </View>
  );
};
