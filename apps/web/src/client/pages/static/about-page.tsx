import { Button } from "@yapmate/components/ui/button";
import { PRICE_IDS, PricingCards } from "@yapmate/components/ui/pricing-cards";
import {
  AlertTriangle,
  Brain,
  Cloud,
  DatabaseIcon,
  FileText,
  Globe,
  Keyboard,
  type LucideIcon,
  Mic,
  Plug,
  Users,
} from "lucide-react";
import { useCallback } from "react";
import { YapIconAnimated } from "../../assets/yap-icon-animated";
import { useUser } from "../../contexts/user-context";
import { ModelsExplorer } from "./models-explorer";
import { RoadmapSection } from "./roadmap-section";
import { StaticLayout } from "./static-layout";

/**
 * AI provider data for the models grid
 * Logos available at https://models.dev/logos/{id}.svg
 */
const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: "GPT-4o, o1, o3" },
  { id: "anthropic", name: "Anthropic", models: "Claude 4, Sonnet" },
  { id: "google", name: "Google", models: "Gemini 2.5 Pro" },
  { id: "deepseek", name: "DeepSeek", models: "R1, V3" },
  { id: "meta", name: "Meta", models: "Llama 4" },
  { id: "mistral", name: "Mistral", models: "Large, Medium" },
  { id: "xai", name: "xAI", models: "Grok 3" },
];

/**
 * Feature data for the features section
 */
const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Brain,
    title: "Multiple AI Models",
    description:
      "Switch between models from top providers. Pick the best for each task.",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your prompts naturally with built-in voice support.",
  },
  {
    icon: Globe,
    title: "Web Search",
    description:
      "Get up-to-date answers with real-time web search integration.",
  },
  {
    icon: Users,
    title: "Multi-User Chats",
    description:
      "Collaborate with others in the same chat. Multiple people can chat with AI together on shared projects.",
  },
  {
    icon: Plug,
    title: "MCP Tools",
    description:
      "Connect external tools and services via HTTP Model Context Protocol.",
  },
  {
    icon: DatabaseIcon,
    title: "User Memory",
    description:
      "Persistent memory across conversations to remember your preferences and context.",
  },
  {
    icon: Keyboard,
    title: "Hotkeys",
    description:
      "Navigate and control the app efficiently with customizable keyboard shortcuts.",
  },
  {
    icon: FileText,
    title: "User Rules",
    description:
      "Set up custom rules that are automatically appended or prepended to your messages.",
  },
  {
    icon: Cloud,
    title: "Sync Everywhere",
    description: "Your conversation history syncs across all your devices.",
  },
];

/**
 * Hero section with main tagline and CTAs
 */
const HeroSection = () => (
  <section className="mx-auto flex flex-col items-center gap-12 py-20 lg:gap-16">
    <div className="flex-1 text-center">
      <div className="my-10 flex items-center justify-center">
        <YapIconAnimated className="text-primary" height={200} width={200} />
      </div>
      <h1 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
        All Top AI Models.
        <br />
        <span className="text-primary">One App.</span>
      </h1>
      <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground lg:mx-0">
        Chat with GPT, Claude, Gemini, and more. No vendor lock-in. Switch
        models freely and pick the best for each task.
      </p>
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <Button
          asChild
          className="h-[46px] rounded-lg px-8 font-semibold"
          size="lg"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/";
            }}
          >
            Start Yapping
          </a>
        </Button>
        <Button
          asChild
          className="h-[46px] p-0 hover:opacity-80"
          variant="ghost"
        >
          <a
            href="https://apps.apple.com/us/app/yapmate/id6757226545"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              alt="Download on the App Store"
              className="h-[46px] dark:hidden"
              height={46}
              src="/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
              width={138}
            />
            <img
              alt="Download on the App Store"
              className="hidden h-[46px] dark:block"
              height={46}
              src="/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg"
              width={138}
            />
          </a>
        </Button>
      </div>
    </div>
    {/* <div className="flex-1">
      <img
        alt="Yapmate chat interface"
        className="mx-auto w-full max-w-6xl rounded-2xl border shadow-lg"
        height={1745}
        src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-inteface.png"
        width={1043}
      />
    </div> */}
    <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-12">
      <img
        alt="Yapmate web app model selection"
        className="w-full min-w-0 max-w-6xl shrink rounded-xl border shadow-lg lg:flex-1"
        height={600}
        src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-example-model-selection.png"
        width={960}
      />
      <img
        alt="Yapmate iOS app markdown render"
        className="w-full min-w-0 max-w-[360px] shrink rounded-3xl border shadow-lg lg:shrink-0"
        height={800}
        src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-ios-markdown-render-small.jpg"
        width={360}
      />
    </div>
  </section>
);

/**
 * Grid showing supported AI providers
 */
// biome-ignore lint/correctness/noUnusedVariables: kept as fallback component
const ModelsSection = () => (
  <section className="mx-auto max-w-6xl py-16">
    <h2 className="mb-4 text-center font-bold text-3xl">
      World's Best AI Models
    </h2>
    <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
      Access models from leading AI providers — all in one place.
    </p>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {AI_PROVIDERS.map((provider) => (
        <div
          className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center"
          key={provider.id}
        >
          <img
            alt={`${provider.name} logo`}
            className="mb-3 size-12 dark:invert"
            height={48}
            src={`https://models.dev/logos/${provider.id}.svg`}
            width={48}
          />
          <span className="font-semibold text-sm">{provider.name}</span>
          <span className="text-muted-foreground text-xs">
            {provider.models}
          </span>
        </div>
      ))}
    </div>
  </section>
);

/**
 * Features grid section
 */
const FeaturesSection = () => (
  <section className="mx-auto max-w-6xl py-16">
    <h2 className="mb-4 text-center font-bold text-3xl">Everything You Need</h2>
    <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
      Powerful features to supercharge your AI conversations.
    </p>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => (
        <div
          className="rounded-xl border border-border bg-card p-6"
          key={feature.title}
        >
          <feature.icon className="mb-4 size-10 text-primary" />
          <h3 className="mb-2 font-semibold text-lg">{feature.title}</h3>
          <p className="text-muted-foreground text-sm">{feature.description}</p>
        </div>
      ))}
    </div>
  </section>
);

/**
 * Platform showcase section
 */
// biome-ignore lint/correctness/noUnusedVariables: kept for future use
const PlatformSection = () => (
  <section className="mx-auto max-w-6xl py-16">
    <h2 className="mb-4 text-center font-bold text-3xl">Web & iOS</h2>
    <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
      Use Yapmate on your favorite device. Same experience, synced everywhere.
    </p>
    <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-12">
      <img
        alt="Yapmate web app model selection"
        className="w-full max-w-6xl rounded-xl border shadow-lg"
        height={600}
        src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-example-model-selection.png"
        width={960}
      />
      <img
        alt="Yapmate iOS app markdown render"
        className="w-full max-w-[360px] rounded-3xl border shadow-lg"
        height={800}
        src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-ios-markdown-render-small.jpg"
        width={360}
      />
    </div>
  </section>
);

/**
 * Pricing section with subscription tiers
 */
const PricingSection = () => {
  const { user } = useUser();

  /**
   * Handles tier selection from pricing cards
   * If authenticated: navigate to app with upgrade param
   * If not authenticated: navigate to login (middleware will handle redirect)
   */
  const handleSelectTier = useCallback(
    (priceId: string) => {
      if (!user) {
        // Not authenticated - redirect to login
        // After login, middleware will redirect to app, but we lose the upgrade intent
        // So we'll use a URL param that login can preserve
        window.location.href = `/login?redirect=${encodeURIComponent("/?upgrade=true")}`;
        return;
      }

      // Authenticated - navigate to app with upgrade param
      // Extract tier from priceId
      const tier = Object.entries(PRICE_IDS).find(
        ([, id]) => id === priceId
      )?.[0];
      const upgradeUrl = tier
        ? `/?upgrade=true&tier=${tier}`
        : "/?upgrade=true";
      window.location.href = upgradeUrl;
    },
    [user]
  );

  /**
   * Handles "Get Started" click on free tier
   * Navigates to root page - router will handle auth redirect if needed
   */
  const handleGetStarted = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <section className="mx-auto max-w-4xl py-16" id="pricing">
      <h2 className="mb-4 text-center font-bold text-3xl">Simple Pricing</h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
        Start free, upgrade when you need more. No hidden fees.
      </p>
      <PricingCards
        onGetStarted={handleGetStarted}
        onSelectTier={handleSelectTier}
      />
    </section>
  );
};

/**
 * Call to action footer section
 */
const CTASection = () => (
  <section className="py-20 text-center">
    <h2 className="mb-4 font-bold text-3xl">Ready to Chat?</h2>
    <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
      Start Yapping with the world's best AI models today.
    </p>
    <div className="flex flex-col justify-center gap-4 sm:flex-row">
      <Button
        asChild
        className="h-[46px] rounded-lg px-8 font-semibold"
        size="lg"
      >
        <a href="/">Get Started — Free</a>
      </Button>
    </div>
  </section>
);

/**
 * About/Landing page component
 */
/**
 * Warning banner for known issues
 */
const IosAuthWarning = () => (
  <div className="mx-auto mt-4 flex max-w-2xl items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
    <AlertTriangle className="size-5 shrink-0" />
    <p>
      We're currently experiencing authentication issues on the iOS app. If you
      have trouble signing in, please use the{" "}
      <a className="underline" href="/">
        web app
      </a>{" "}
      in the meantime. We're working on a fix.
    </p>
  </div>
);

export const AboutPage = () => (
  <StaticLayout>
    <IosAuthWarning />
    <HeroSection />
    <div id="models">
      <ModelsExplorer />
    </div>
    <FeaturesSection />
    <RoadmapSection />
    <PricingSection />
    {/* <PlatformSection /> */}
    <CTASection />
  </StaticLayout>
);
