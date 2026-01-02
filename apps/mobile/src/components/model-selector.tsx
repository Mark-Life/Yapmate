import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text } from "react-native";
import { Icon } from "@/components/ui/icon";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useModels } from "../hooks/use-models";

type ModelSelectorProps = {
  model: string;
  /** Optional className to override trigger styles (e.g., when inside GlassView) */
  triggerClassName?: string;
  /** Callback fired when model selector is opened */
  onOpen?: () => void;
};

/**
 * Model selector trigger button
 * Navigates to model-selector screen when pressed
 */
export const ModelSelector = ({
  model,
  triggerClassName,
  onOpen,
}: ModelSelectorProps) => {
  const router = useRouter();
  const { models, loading } = useModels();

  const currentModel = useMemo(
    () => models.find((m) => m.value === model),
    [model, models]
  );

  /**
   * Navigates to model-selector screen with current model as param
   */
  const handleOpen = () => {
    lightTap();
    onOpen?.();
    router.push({
      pathname: "/model-selector",
      params: { model },
    });
  };

  return (
    <Pressable
      className={cn(
        "flex h-9 flex-row items-center gap-2 rounded-full px-3 py-2",
        triggerClassName ?? "bg-transparent"
      )}
      onPress={handleOpen}
    >
      <Text
        className={cn(
          "flex-1 text-sm",
          currentModel ? "text-foreground" : "text-muted-foreground"
        )}
        ellipsizeMode="tail"
        numberOfLines={1}
      >
        {loading ? "Loading..." : (currentModel?.name ?? "Select model")}
      </Text>
      <Icon
        as={ChevronDown}
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Pressable>
  );
};
