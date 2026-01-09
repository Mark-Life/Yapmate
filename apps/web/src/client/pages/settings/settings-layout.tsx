import { cn } from "@yapmate/components/lib/utils";
import { Button } from "@yapmate/components/ui/button";
import { ArrowLeftIcon, SparklesIcon, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { navigate } from "../../router";
import { ProfileSection } from "./profile-section";

type SettingsSection = "profile" | "models";

const VALID_SECTIONS: SettingsSection[] = ["profile", "models"];
const SETTINGS_PATH_REGEX = /^\/settings\/([^/]+)/;

/**
 * Extracts settings section from URL path
 * Returns "profile" as default if path is invalid
 */
const getSectionFromPath = (pathname: string): SettingsSection => {
  const match = pathname.match(SETTINGS_PATH_REGEX);
  const section = match?.[1];
  if (section && VALID_SECTIONS.includes(section as SettingsSection)) {
    return section as SettingsSection;
  }
  return "profile";
};

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
      "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors md:w-full",
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
 * URL-driven section selection: /settings/profile, /settings/models
 */
export const SettingsLayout = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(() =>
    getSectionFromPath(window.location.pathname)
  );

  // Redirect /settings to /settings/profile and sync state with URL
  useEffect(() => {
    const pathname = window.location.pathname;

    // Redirect bare /settings to /settings/profile
    if (pathname === "/settings" || pathname === "/settings/") {
      navigate("/settings/profile");
      return;
    }

    // Sync section from URL
    setActiveSection(getSectionFromPath(pathname));
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveSection(getSectionFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleBackToChats = () => {
    navigate("/");
  };

  const handleSectionClick = (sectionId: SettingsSection) => {
    navigate(`/settings/${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="relative mx-auto flex h-14 max-w-4xl items-center px-4">
          <Button
            className="gap-2"
            onClick={handleBackToChats}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold">
            Settings
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-8">
        {/* Navigation - horizontal on mobile, sidebar on desktop */}
        <nav className="shrink-0 md:w-48">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavButton
                  isActive={activeSection === item.id}
                  item={item}
                  onClick={() => handleSectionClick(item.id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          <SectionContent section={activeSection} />
        </div>
      </main>
    </div>
  );
};
