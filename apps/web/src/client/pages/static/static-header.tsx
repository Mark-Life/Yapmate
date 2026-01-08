import { Button } from "@yapmate/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { YapLogo } from "../../assets/yap-logo";

/**
 * Navigation items for static pages header
 */
const NAV_ITEMS = [
  { label: "About", href: "/about" },
  { label: "Models", href: "/about#models" },
  { label: "Pricing", href: "/about#pricing" },
] as const;

/**
 * Shared header with navigation for static pages
 */
export const StaticHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="relative border-border border-b">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-4 py-2">
        {/* Logo */}
        <a
          className="flex items-center transition-opacity hover:opacity-80"
          href="/about"
        >
          <YapLogo className="h-10 w-auto text-primary" />
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              className={`text-sm transition-opacity hover:opacity-80 ${
                currentPath === item.href
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
          <Button asChild>
            <a href="/">Start Chatting</a>
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
          onClick={toggleMenu}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen ? (
        <nav className="absolute top-full right-0 left-0 z-50 border-border border-b bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_ITEMS.map((item) => (
              <a
                className={`text-base transition-opacity hover:opacity-80 ${
                  currentPath === item.href
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <Button asChild className="mt-2" onClick={closeMenu}>
              <a href="/">Start Chatting</a>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
};
