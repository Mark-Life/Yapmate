import * as PopoverPrimitive from "@rn-primitives/popover";
import * as React from "react";
import { Platform, StyleSheet } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import { NativeOnlyAnimatedView } from "src/components/ui/native-only-animated-view";
import { TextClassContext } from "src/components/ui/text";
import { cn } from "src/lib/utils";

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root> & {
  open?: boolean;
};

const Popover = PopoverPrimitive.Root as React.FC<PopoverProps>;

const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * Returns the appropriate overlay wrapper.
 * Uses FullWindowOverlay on iOS when rendering to root portal.
 * When portalHost is specified, skips FullWindowOverlay to stay within KeyboardAvoidingView.
 */
const getOverlayWrapper = (portalHost?: string) => {
  if (portalHost) {
    return React.Fragment;
  }
  return Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;
};

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalHost,
  ...props
}: PopoverPrimitive.ContentProps &
  React.RefAttributes<PopoverPrimitive.ContentRef> & {
    portalHost?: string;
  }) {
  const OverlayWrapper = getOverlayWrapper(portalHost);

  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <OverlayWrapper>
        <PopoverPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(200)}
            exiting={FadeOut}
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                className={cn(
                  "z-50 w-72 rounded-md border border-border bg-popover p-4 shadow-black/5 shadow-md outline-hidden",
                  Platform.select({
                    web: cn(
                      "fade-in-0 zoom-in-95 origin-(--radix-popover-content-transform-origin) animate-in cursor-auto",
                      props.side === "bottom" && "slide-in-from-top-2",
                      props.side === "top" && "slide-in-from-bottom-2"
                    ),
                  }),
                  className
                )}
                sideOffset={sideOffset}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </OverlayWrapper>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
