import { FileIcon, XIcon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Attachment } from "@/hooks/use-attachments";
import { cn } from "@/lib/utils";

type AttachmentPreviewProps = {
  attachment: Attachment;
  onRemove: (id: string) => void;
};

/**
 * Component for displaying a single attachment preview
 */
export const AttachmentPreview = ({
  attachment,
  onRemove,
}: AttachmentPreviewProps) => {
  const isImage = attachment.mediaType.startsWith("image/");

  return (
    <View className="relative mr-2 mb-2">
      <View
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-muted",
          isImage ? "size-20" : "h-20 w-32"
        )}
      >
        {isImage ? (
          <Image
            className="size-full"
            resizeMode="cover"
            source={{ uri: attachment.uri }}
          />
        ) : (
          <View className="flex size-full items-center justify-center">
            <Icon as={FileIcon} className="size-8 text-muted-foreground" />
          </View>
        )}
        <Pressable
          className="absolute top-1 right-1 rounded-full bg-destructive p-1"
          onPress={() => onRemove(attachment.id)}
        >
          <Icon as={XIcon} className="size-3 text-destructive-foreground" />
        </Pressable>
      </View>
      {!isImage && (
        <Text
          className="mt-1 max-w-32 truncate text-muted-foreground text-xs"
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
      )}
    </View>
  );
};

type AttachmentPreviewListProps = {
  attachments: Attachment[];
  onRemove: (id: string) => void;
};

/**
 * Component for displaying a list of attachment previews
 */
export const AttachmentPreviewList = ({
  attachments,
  onRemove,
}: AttachmentPreviewListProps) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <View className="mb-2 flex-row flex-wrap px-2">
      {attachments.map((attachment) => (
        <AttachmentPreview
          attachment={attachment}
          key={attachment.id}
          onRemove={onRemove}
        />
      ))}
    </View>
  );
};
