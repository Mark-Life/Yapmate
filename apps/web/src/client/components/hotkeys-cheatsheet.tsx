import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import { Kbd, KbdGroup } from "@yapmate/components/ui/kbd";
import { HOTKEYS, splitHotkey } from "../hooks/use-hotkeys-config";

type HotkeysCheatsheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type HotkeyGroup = {
  title: string;
  items: Array<{
    action: string;
    hotkey: string;
  }>;
};

/**
 * Hotkeys cheatsheet dialog showing all available keyboard shortcuts
 */
export const HotkeysCheatsheet = ({
  open,
  onOpenChange,
}: HotkeysCheatsheetProps) => {
  const groups: HotkeyGroup[] = [
    {
      title: "Navigation",
      items: [
        { action: "New chat", hotkey: HOTKEYS.newChat },
        { action: "Focus prompt", hotkey: HOTKEYS.focusPrompt },
        { action: "Settings", hotkey: HOTKEYS.settings },
        { action: "Show shortcuts", hotkey: HOTKEYS.help },
      ],
    },
    {
      title: "Chat Input",
      items: [
        { action: "Submit message", hotkey: HOTKEYS.submit },
        { action: "New line", hotkey: HOTKEYS.newLine },
        { action: "Stop streaming", hotkey: HOTKEYS.stop },
        { action: "Toggle voice input", hotkey: HOTKEYS.toggleVoice },
        { action: "Toggle web search", hotkey: HOTKEYS.toggleSearch },
        { action: "Open model selector", hotkey: HOTKEYS.openModelSelector },
        { action: "Open MCP tool selector", hotkey: HOTKEYS.openToolSelector },
        { action: "Open rule selector", hotkey: HOTKEYS.openRuleSelector },
        { action: "Attach file", hotkey: HOTKEYS.attachFile },
        { action: "Cycle reasoning depth", hotkey: HOTKEYS.cycleReasoning },
        { action: "Toggle memory", hotkey: HOTKEYS.toggleMemory },
      ],
    },
  ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press{" "}
            <KbdGroup>
              {splitHotkey(HOTKEYS.help).map((key, idx) => (
                <Kbd key={idx}>{key}</Kbd>
              ))}
            </KbdGroup>{" "}
            to toggle this dialog
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 md:grid-cols-2">
          {groups.map((group) => (
            <div className="space-y-2" key={group.title}>
              <h3 className="font-semibold text-sm">{group.title}</h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={item.action}
                  >
                    <span className="text-muted-foreground">{item.action}</span>
                    <KbdGroup>
                      {splitHotkey(item.hotkey).map((key, idx) => (
                        <Kbd key={idx}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
