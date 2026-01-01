import { Mail } from "lucide-react";
import { YapIconAnimated } from "../../assets/yap-icon-animated";

/**
 * Hero section with icon and main message
 */
const HeroSection = () => (
  <section className="mx-auto flex flex-col items-center gap-12 py-20 lg:gap-16">
    <div className="flex-1 text-center">
      <div className="my-10 flex items-center justify-center opacity-60">
        <YapIconAnimated className="text-primary" height={200} width={200} />
      </div>
      <h1 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
        Help & Feedback
      </h1>
    </div>
  </section>
);

/**
 * Main content section with development message and contact info
 */
const ContentSection = () => (
  <section className="mx-auto max-w-2xl py-16">
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="mx-auto mb-6 text-lg text-muted-foreground">
        Our app is under active development and constant testing. We're glad to
        receive any feedback that can help us improve.
      </p>
      <div className="mb-6 flex items-center justify-center gap-3">
        <Mail className="size-5 text-primary" />
        <a
          className="font-semibold text-primary transition-opacity hover:opacity-80"
          href="mailto:108@mark-life.com"
        >
          108@mark-life.com
        </a>
      </div>
      <p className="text-muted-foreground text-sm italic">
        Proper feedback form coming soon™
      </p>
    </div>
  </section>
);

/**
 * Help page component
 */
export const HelpPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-8xl px-4">
      <HeroSection />
      <ContentSection />
    </div>
    <footer className="border-border border-t py-8 text-center text-muted-foreground text-sm">
      © {new Date().getFullYear()} Mark Life Ltd. All rights reserved.
    </footer>
  </div>
);
