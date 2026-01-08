/**
 * Footer navigation links
 */
const FOOTER_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/policy" },
  { label: "Help", href: "/help" },
] as const;

/**
 * Shared footer for static pages
 */
export const StaticFooter = () => (
  <footer className="border-border border-t py-8">
    <div className="mx-auto flex max-w-8xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        © {new Date().getFullYear()}{" "}
        <a
          className="transition-opacity hover:opacity-80"
          href="https://mark-life.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Mark Life Ltd
        </a>
      </p>
      <nav className="flex items-center gap-6">
        {FOOTER_LINKS.map((link) => (
          <a
            className="text-muted-foreground text-sm transition-opacity hover:opacity-80"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  </footer>
);
