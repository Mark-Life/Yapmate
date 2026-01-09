import {
  Bot,
  Calendar,
  Chrome,
  FolderKanban,
  Image,
  type LucideIcon,
  Plug,
  Search,
  Sheet,
  Speaker,
  Workflow,
} from "lucide-react";

/**
 * Roadmap feature item definition
 */
type RoadmapFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

/**
 * Planned features for the roadmap
 */
const ROADMAP_FEATURES: RoadmapFeature[] = [
  {
    icon: Plug,
    title: "MCP Support",
    description:
      "Connect external tools and services via Model Context Protocol.",
  },
  {
    icon: Calendar,
    title: "Scheduled Tasks",
    description:
      "Automate routine research and get daily updates on topics you care about.",
  },
  {
    icon: Workflow,
    title: "Workflows",
    description:
      "Build AI-powered automations connecting different services and agents.",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description:
      "Specialized agents for deep research, analysis, and complex tasks.",
  },
  {
    icon: FolderKanban,
    title: "Projects & Memory",
    description:
      "Organize chats by project with shared context and persistent memory.",
  },
  {
    icon: Search,
    title: "Chat Context",
    description:
      "Link anything in your chat history with intelligent vectorized search.",
  },
  {
    icon: Image,
    title: "Image Generation",
    description: "Create images directly in chat with AI generation models.",
  },
  {
    icon: Speaker,
    title: "Audio Generation",
    description:
      "Convert text to natural speech with multiple voice providers.",
  },
  {
    icon: Sheet,
    title: "Google Docs",
    description: "Work with Google Docs and other documents directly in chat.",
  },
  {
    icon: Chrome,
    title: "Chrome Extension",
    description: "Access Yapmate anywhere on the web with a browser extension.",
  },
];

/**
 * Single roadmap feature card
 */
const RoadmapCard = ({ feature }: { feature: RoadmapFeature }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="mb-3 flex items-center gap-3">
      <feature.icon className="size-6 text-primary" />
      <h3 className="font-semibold">{feature.title}</h3>
    </div>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {feature.description}
    </p>
  </div>
);

/**
 * Roadmap section showing planned features
 */
export const RoadmapSection = () => (
  <section className="mx-auto max-w-6xl py-16">
    <h2 className="mb-4 text-center font-bold text-3xl">What's Coming</h2>
    <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
      We're building powerful features to make Yapmate your complete AI
      workspace.
    </p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {ROADMAP_FEATURES.map((feature) => (
        <RoadmapCard feature={feature} key={feature.title} />
      ))}
    </div>
  </section>
);
