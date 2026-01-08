import { cn } from "@yapmate/components/lib/utils";
import { Button } from "@yapmate/components/ui/button";
import { ArrowLeftIcon, SparklesIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { navigate } from "../../router";
import { ProfileSection } from "./profile-section";

type SettingsSection = "profile" | "models";

type NavItem = {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: <UserIcon className="size-4" /> },
  { id: "models", label: "Models", icon: <SparklesIcon className="size-4" /> },
];

/**
 * Navigation item button for settings sidebar
 */
const NavButton = ({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    className={cn(
      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    )}
    onClick={onClick}
    type="button"
  >
    {item.icon}
    {item.label}
  </button>
);

/**
 * Renders content for the selected settings section
 */
const SectionContent = ({ section }: { section: SettingsSection }) => {
  switch (section) {
    case "profile":
      return <ProfileSection />;
    case "models":
      return (
        <div className="text-muted-foreground">
          Models settings coming soon...
        </div>
      );
    default:
      return null;
  }
};

/**
 * Settings page layout with vertical navigation sidebar
 */
export const SettingsLayout = () => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");

  const handleBackToChats = () => {
    navigate("/");
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto grid h-14 max-w-4xl grid-cols-[auto_1fr_auto] items-center px-4">
          <Button
            className="gap-2"
            onClick={handleBackToChats}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-center font-semibold">Settings</h1>
          <div />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 gap-8 px-4 py-8">
        {/* Sidebar navigation */}
        <nav className="w-48 shrink-0">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavButton
                  isActive={activeSection === item.id}
                  item={item}
                  onClick={() => setActiveSection(item.id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Content area */}
        <div className="flex-1">
          <SectionContent section={activeSection} />
        </div>
      </main>
    </div>
  );
};
