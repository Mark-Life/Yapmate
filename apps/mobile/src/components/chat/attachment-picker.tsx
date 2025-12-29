import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon, FileIcon, ImageIcon } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { AttachmentsContext } from "@/hooks/use-attachments";
import { cn } from "@/lib/utils";

type AttachmentPickerProps = {
  attachments: AttachmentsContext;
};

/**
 * Component for picking attachments from camera, photo library, or documents
 */
export const AttachmentPicker = ({ attachments }: AttachmentPickerProps) => {
  /**
   * Requests camera permissions and opens camera
   */
  const handleTakePhoto = async () => {
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
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Add attachment"
          className={cn(
            "rounded-full transition-all duration-200",
            hasAttachments && "bg-primary text-primary-foreground"
          )}
          size="icon"
          variant="outline"
        >
          <Icon
            as={ImageIcon}
            className={cn(
              "size-4",
              hasAttachments ? "text-primary-foreground" : "text-primary"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={16}>
        <DropdownMenuItem onPress={handleTakePhoto}>
          <Icon as={CameraIcon} className="mr-2 size-4" />
          <Text>Take Photo</Text>
        </DropdownMenuItem>
        <DropdownMenuItem onPress={handleChooseFromLibrary}>
          <Icon as={ImageIcon} className="mr-2 size-4" />
          <Text>Choose from Library</Text>
        </DropdownMenuItem>
        <DropdownMenuItem onPress={handleChooseDocument}>
          <Icon as={FileIcon} className="mr-2 size-4" />
          <Text>Choose Document</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
