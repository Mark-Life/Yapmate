/**
 * Microphone button component for audio recording and transcription
 * Records audio using expo-av and sends to /api/transcribe endpoint
 */

import { Audio } from "expo-av";
import { Loader2Icon, MicIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { generateAPIUrl } from "@/lib/api-url";
import { lightTap } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type TranscribeButtonProps = {
  onTranscriptionChange?: (text: string) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Button that records audio and transcribes it using the API
 */
export const TranscribeButton = ({
  onTranscriptionChange,
  className,
  disabled,
}: TranscribeButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const rotation = useSharedValue(0);

  /**
   * Cleanup function to stop recording
   */
  const cleanup = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
      recordingRef.current = null;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });
  }, []);

  /**
   * Derived rotation string value
   */
  const rotationString = useDerivedValue(() => `${rotation.value}deg`);

  /**
   * Animated style for spinning loader
   */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rotationString.value }],
  }));

  /**
   * Start/stop rotation animation based on transcribing state
   */
  useEffect(() => {
    if (isTranscribing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isTranscribing, rotation]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Fire and forget async cleanup
      cleanup().catch((error) => {
        console.error("Error during cleanup:", error);
      });
    };
  }, [cleanup]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      lightTap();
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access microphone was denied");
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
    }
  }, []);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      return;
    }

    try {
      lightTap();
      setIsRecording(false);
      setIsTranscribing(true);

      // Stop and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI available");
      }

      // Get session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Create FormData with audio file
      // React Native FormData requires a specific format
      const formData = new FormData();
      const audioFile: {
        uri: string;
        type: string;
        name: string;
      } = {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      };
      formData.append("audio", audioFile as unknown as Blob);

      // Send to transcription API
      const response = await fetch(generateAPIUrl("/api/transcribe"), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const { text } = await response.json();

      if (text) {
        onTranscriptionChange?.(text);
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
      await cleanup();
    }
  }, [onTranscriptionChange, cleanup]);

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isDisabled = disabled || isTranscribing;

  const getAriaLabel = () => {
    if (isTranscribing) {
      return "Transcribing...";
    }
    if (isRecording) {
      return "Stop recording";
    }
    return "Start recording";
  };

  return (
    <Button
      aria-label={getAriaLabel()}
      className={cn(
        "transition-all duration-200",
        isRecording && "animate-pulse",
        isTranscribing && "opacity-50",
        className
      )}
      disabled={isDisabled}
      onPress={toggleRecording}
      size="icon"
      variant="ghost"
    >
      {isTranscribing ? (
        <Animated.View style={animatedStyle}>
          <Icon
            as={Loader2Icon}
            className={cn(
              "size-4",
              isRecording ? "text-destructive" : "text-primary"
            )}
          />
        </Animated.View>
      ) : (
        <Icon
          as={MicIcon}
          className={cn(
            "size-4",
            isRecording ? "text-destructive" : "text-primary"
          )}
        />
      )}
    </Button>
  );
};
