Catalog
The catalog defines what AI can generate. It's your guardrail.

What is a Catalog?
A catalog is a schema that defines:

Components — UI elements AI can create
Actions — Operations AI can trigger
Validation Functions — Custom validators for form inputs
Creating a Catalog

```ts
import { createCatalog } from "@json-render/core";
import { z } from "zod";

const catalog = createCatalog({
  components: {
    // Define each component with its props schema
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        padding: z.enum(["sm", "md", "lg"]).default("md"),
      }),
      hasChildren: true, // Can contain other components
    },

    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(), // JSON Pointer to data
        format: z.enum(["currency", "percent", "number"]),
      }),
    },
  },

  actions: {
    submit_form: {
      params: z.object({
        formId: z.string(),
      }),
      description: "Submit a form",
    },

    export_data: {
      params: z.object({
        format: z.enum(["csv", "pdf", "json"]),
      }),
    },
  },

  validationFunctions: {
    isValidEmail: {
      description: "Validates email format",
    },
    isPhoneNumber: {
      description: "Validates phone number",
    },
  },
});
```

Component Definition
Each component in the catalog has:

```ts
{
  props: z.object({...}),  // Zod schema for props
  hasChildren?: boolean,    // Can it have children?
  description?: string,     // Help AI understand when to use it
}
```

Generating AI Prompts
Use generateCatalogPrompt to create a system prompt for AI:

```ts
import { generateCatalogPrompt } from "@json-render/core";

const systemPrompt = generateCatalogPrompt(catalog);
// Pass this to your AI model as the system prompt
```
