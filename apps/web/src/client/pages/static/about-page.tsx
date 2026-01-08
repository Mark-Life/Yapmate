import { PricingCards } from "@yapmate/components/ui/pricing-cards";
import {
  Brain,
  Cloud,
  Globe,
  type LucideIcon,
  Mic,
  Paperclip,
  Zap,
} from "lucide-react";
import { YapIconAnimated } from "../../assets/yap-icon-animated";

import { ModelsExplorer } from "./models-explorer";

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
    icon: Globe,
    title: "Web Search",
    description:
      "Get up-to-date answers with real-time web search integration.",
  },
  {
    icon: Paperclip,
    title: "Share Files",
    description: "Upload images and documents directly in your conversations.",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your prompts naturally with built-in voice support.",
  },
  {
    icon: Cloud,
    title: "Sync Everywhere",
    description: "Your conversation history syncs across all your devices.",
  },
  {
    icon: Zap,
    title: "Fast Streaming",
    description: "Watch responses appear in real-time with streaming output.",
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
        <a
          className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          href="/"
        >
          Start Chatting
        </a>
        {/* TODO: Replace with actual App Store link once approved */}
        <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-border px-8 py-3 font-semibold text-muted-foreground">
          App Store — Coming Soon
        </span>
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
const PricingSection = () => (
  <section className="mx-auto max-w-4xl py-16">
    <h2 className="mb-4 text-center font-bold text-3xl">Simple Pricing</h2>
    <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
      Start free, upgrade when you need more. No hidden fees.
    </p>
    <PricingCards />
  </section>
);

/**
 * Call to action footer section
 */
const CTASection = () => (
  <section className="py-20 text-center">
    <h2 className="mb-4 font-bold text-3xl">Ready to Chat?</h2>
    <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
      Start chatting with the world's best AI models today.
    </p>
    <div className="flex flex-col justify-center gap-4 sm:flex-row">
      <a
        className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        href="/"
      >
        Get Started — Free
      </a>
    </div>
  </section>
);

/**
 * About/Landing page component
 */
export const AboutPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-8xl px-4">
      <HeroSection />
      <ModelsExplorer />
      <FeaturesSection />
      <PricingSection />
      {/* <PlatformSection /> */}
      <CTASection />
    </div>
    <footer className="border-border border-t py-8 text-center text-muted-foreground text-sm">
      © {new Date().getFullYear()}{" "}
      <a
        className="transition-opacity hover:opacity-80"
        href="https://mark-life.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        Mark Life Ltd
      </a>
      . All rights reserved.
    </footer>
  </div>
);
