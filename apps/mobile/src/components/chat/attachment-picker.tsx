import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ImageIcon } from "lucide-react-native";
import { Button as UIButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import type { AttachmentsContext } from "@/hooks/use-attachments";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type AttachmentPickerProps = {
  attachments: AttachmentsContext;
};

/**
 * Component for picking attachments from camera, photo library, or documents
 */
export const AttachmentPicker = ({ attachments }: AttachmentPickerProps) => {
  const { capture } = useAnalytics();

  /**
   * Requests camera permissions and opens camera
   */
  const handleTakePhoto = async () => {
    lightTap();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        // biome-ignore lint/suspicious/noAlert: expected
        alert("Camera permission is required to take photos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        capture(AnalyticsEvents.ATTACHMENT_ADDED, { type: "camera" });
        attachments.add(
          asset.uri,
          asset.mimeType ?? "image/jpeg",
          asset.fileName ?? `photo_${Date.now()}.jpg`
        );
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  /**
   * Requests media library permissions and opens photo picker
   */
  const handleChooseFromLibrary = async () => {
    lightTap();
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        // biome-ignore lint/suspicious/noAlert: expected
        alert("Photo library permission is required to select photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          capture(AnalyticsEvents.ATTACHMENT_ADDED, { type: "library" });
          attachments.add(
            asset.uri,
            asset.mimeType ?? "image/jpeg",
            asset.fileName ?? `photo_${Date.now()}.jpg`
          );
        }
      }
    } catch (error) {
      console.error("Error choosing from library:", error);
    }
  };

  /**
   * Opens document picker
   */
  const handleChooseDocument = async () => {
    lightTap();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          capture(AnalyticsEvents.ATTACHMENT_ADDED, { type: "document" });
          attachments.add(
            asset.uri,
            asset.mimeType ?? "application/octet-stream",
            asset.name
          );
        }
      }
    } catch (error) {
      console.error("Error choosing document:", error);
    }
  };

  const hasAttachments = attachments.files.length > 0;

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          <Button onPress={handleTakePhoto} systemImage="camera.fill">
            Take Photo
          </Button>
          <Button
            onPress={handleChooseFromLibrary}
            systemImage="photo.on.rectangle"
          >
            Choose from Library
          </Button>
          <Button onPress={handleChooseDocument} systemImage="doc.text">
            Choose Document
          </Button>
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <UIButton
            aria-label="Add attachment"
            className="transition-all duration-200"
            onPress={lightTap}
            size="icon"
            variant="ghost"
          >
            <Icon
              as={ImageIcon}
              className={cn(
                "size-4",
                hasAttachments ? "text-primary-foreground" : "text-primary"
              )}
            />
          </UIButton>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
};
