import { CheckIcon, XIcon } from "lucide-react-native";
import { Pressable } from "react-native";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Renders edit action buttons (Cancel and Save)
 * Used inline during message editing mode
 */
export const EditActions = ({
  isUser,
  hasChanges,
  iconColor,
  onCancel,
  onSave,
}: {
  isUser: boolean;
  hasChanges: boolean;
  iconColor: string;
  onCancel: () => void;
  onSave: () => void;
}) => (
  <>
    <Pressable
      className={cn("rounded p-1", isUser && "self-end")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onCancel();
      }}
    >
      <XIcon color={iconColor} size={16} />
    </Pressable>
    <Pressable
      className={cn(
        "rounded p-1",
        isUser && "self-end",
        !hasChanges && "opacity-50"
      )}
      disabled={!hasChanges}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onSave();
      }}
    >
      <CheckIcon color={iconColor} size={16} />
    </Pressable>
  </>
);
