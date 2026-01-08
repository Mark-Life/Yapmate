import { BANNED_MODELS, TOP_MODELS } from "@yapmate/core/models/config";
import { parseModel } from "@yapmate/server/lib/models/models";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { rpcClient } from "../../lib/rpc-client";

/** Regex for stripping trailing .0 from formatted numbers */
const TRAILING_ZERO_REGEX = /\.0$/;

type ModelFromApi = {
  id: string;
  name: string;
  contextLimit: number;
};

type DisplayModel = {
  id: string;
  name: string;
  provider: string;
  providerDisplay: string;
  tags: string[];
  contextLimit: number;
  isTopModel?: boolean;
};

/**
 * Formats provider name for display (matches model-selector.tsx)
 */
const getProviderDisplayName = (provider: string): string => {
  if (provider === "common") {
    return "Common";
  }
  if (provider === "google") {
    return "Google";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  if (provider === "anthropic") {
    return "Anthropic";
  }
  if (provider === "deepseek") {
    return "DeepSeek";
  }
  if (provider === "xai") {
    return "xAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

/**
 * Extracts tags from model ID (e.g., ":free", ":beta")
 */
const extractTags = (modelId: string): string[] => {
  const parts = modelId.split(":");
  return parts.slice(1).filter(Boolean);
};

/**
 * Formats context limit for display
 */
const formatContextLimit = (limit: number): string => {
  if (limit >= 1_000_000) {
    return `${(limit / 1_000_000).toFixed(1).replace(TRAILING_ZERO_REGEX, "")}M`;
  }
  if (limit >= 1000) {
    return `${Math.round(limit / 1000)}K`;
  }
  return String(limit);
};

/**
 * Transforms API models to display format using parseModel for consistency
 * Filters out banned models and marks top models for sorting
 */
const transformModels = (models: ModelFromApi[]): DisplayModel[] => {
  const bannedSet = new Set(BANNED_MODELS as readonly string[]);
  const topModelsSet = new Set(TOP_MODELS as readonly string[]);

  return models
    .filter((model) => !bannedSet.has(model.id))
    .map((model) => {
      const tags = extractTags(model.id);
      // Remove tags from ID before parsing to get clean model name
      const baseModelId = model.id.split(":")[0];
      const { provider, modelName } = parseModel(baseModelId);
      return {
        id: model.id,
        name: modelName,
        provider,
        providerDisplay: getProviderDisplayName(provider),
        tags,
        contextLimit: model.contextLimit,
        isTopModel: topModelsSet.has(model.id),
      };
    });
};

type ProviderGroup = {
  provider: string;
  providerDisplay: string;
  models: DisplayModel[];
};

/**
 * Groups models by provider, with top models in a "Common" group first
 * Matches model-selector.tsx pattern for consistency
 */
const groupModelsByProvider = (models: DisplayModel[]): ProviderGroup[] => {
  const topModels: DisplayModel[] = [];
  const grouped = new Map<string, DisplayModel[]>();

  for (const model of models) {
    if (model.isTopModel) {
      topModels.push(model);
    } else {
      const existing = grouped.get(model.provider) ?? [];
      grouped.set(model.provider, [...existing, model]);
    }
  }

  const result: ProviderGroup[] = [];

  // Add Common group first if it has models
  if (topModels.length > 0) {
    // Sort top models by provider then name
    topModels.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });
    result.push({
      provider: "common",
      providerDisplay: "Common",
      models: topModels,
    });
  }

  // Add other provider groups, sorted by provider name
  const sortedProviders = Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [provider, providerModels] of sortedProviders) {
    // Sort models within each provider by name
    providerModels.sort((a, b) => a.name.localeCompare(b.name));
    result.push({
      provider,
      providerDisplay: getProviderDisplayName(provider),
      models: providerModels,
    });
  }

  return result;
};

/**
 * Badge component for model tags
 */
const TagBadge = ({ tag }: { tag: string }) => {
  const colorMap: Record<string, string> = {
    free: "bg-green-500/15 text-green-700 dark:text-green-400",
    experimental: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    beta: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    preview: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 font-medium text-[11px] ${colorMap[tag.toLowerCase()] ?? "bg-muted text-muted-foreground"}`}
    >
      {tag}
    </span>
  );
};

/**
 * Provider logo with fallback
 */
const ProviderLogo = ({ provider }: { provider: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <div className="size-5 rounded-full bg-muted" />;
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is valid for img fallback
    <img
      alt=""
      className="size-5 dark:invert"
      height={20}
      onError={() => setHasError(true)}
      src={`https://models.dev/logos/${provider}.svg`}
      width={20}
    />
  );
};

/**
 * Single model row (without provider - shown in group header)
 */
const ModelRow = ({ model }: { model: DisplayModel }) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <div className="min-w-0 flex-1">
      <span className="truncate font-medium text-sm">{model.name}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {model.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
      <span className="text-muted-foreground text-xs tabular-nums">
        {formatContextLimit(model.contextLimit)}
      </span>
    </div>
  </div>
);

/**
 * Provider group section with header and models
 */
const ProviderSection = ({ group }: { group: ProviderGroup }) => (
  <div className="border-border border-b last:border-b-0">
    <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
      <ProviderLogo provider={group.provider} />
      <span className="font-semibold text-sm">{group.providerDisplay}</span>
      <span className="text-muted-foreground text-xs">
        ({group.models.length})
      </span>
    </div>
    <div className="divide-y divide-border/50">
      {group.models.map((model) => (
        <ModelRow key={model.id} model={model} />
      ))}
    </div>
  </div>
);

/**
 * Loading skeleton rows
 */
const LoadingSkeleton = () => (
  <div className="divide-y divide-border">
    {Array.from({ length: 8 }).map((_, i) => (
      <div className="flex items-center gap-3 px-4 py-3" key={`skeleton-${i}`}>
        <div className="size-5 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
    ))}
  </div>
);

/**
 * Models list content - handles loading/error/empty/list states
 */
const ModelsListContent = ({
  loading,
  error,
  groupedModels,
  searchQuery,
}: {
  loading: boolean;
  error: string | null;
  groupedModels: ProviderGroup[];
  searchQuery: string;
}) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        {error}
      </div>
    );
  }

  const totalModels = groupedModels.reduce(
    (sum, g) => sum + g.models.length,
    0
  );

  if (totalModels === 0) {
    const message = searchQuery
      ? `No models found for "${searchQuery}"`
      : "No models available";
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        {message}
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {groupedModels.map((group) => (
        <ProviderSection group={group} key={group.provider} />
      ))}
    </div>
  );
};

/**
 * Filter results count display
 */
const FilterResultsCount = ({
  filteredCount,
  totalCount,
}: {
  filteredCount: number;
  totalCount: number;
}) => {
  if (filteredCount === 0) {
    return null;
  }

  return (
    <p className="mt-3 text-center text-muted-foreground text-sm">
      Showing {filteredCount} of {totalCount} models
    </p>
  );
};

/**
 * Interactive models explorer - flat searchable list
 */
export const ModelsExplorer = () => {
  const [models, setModels] = useState<DisplayModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch models from server API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { models: apiModels } = await rpcClient.models.list();
        setModels(transformModels(apiModels));
      } catch {
        setError("Unable to load models. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Filter and group models by search query
  const { groupedModels, filteredCount } = useMemo(() => {
    const filtered = searchQuery.trim()
      ? models.filter((m) => {
          const query = searchQuery.toLowerCase();
          return (
            m.name.toLowerCase().includes(query) ||
            m.provider.includes(query) ||
            m.providerDisplay.toLowerCase().includes(query) ||
            m.id.toLowerCase().includes(query)
          );
        })
      : models;

    return {
      groupedModels: groupModelsByProvider(filtered),
      filteredCount: filtered.length,
    };
  }, [models, searchQuery]);

  const isReady = !loading && error === null;
  const showFilterCount = isReady && searchQuery.length > 0;

  return (
    <section className="mx-auto max-w-3xl py-16">
      <h2 className="mb-2 text-center font-bold text-3xl">Available Models</h2>
      <p className="mx-auto mb-8 max-w-xl text-center text-muted-foreground">
        {loading
          ? "Loading..."
          : `${models.length} AI models from leading providers`}
      </p>

      {/* Search input - sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-card py-3 pr-4 pl-10 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Models list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ModelsListContent
          error={error}
          groupedModels={groupedModels}
          loading={loading}
          searchQuery={searchQuery}
        />
      </div>

      {/* Results count when filtering */}
      {showFilterCount ? (
        <FilterResultsCount
          filteredCount={filteredCount}
          totalCount={models.length}
        />
      ) : null}
    </section>
  );
};
