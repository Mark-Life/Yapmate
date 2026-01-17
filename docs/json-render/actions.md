Actions
Handle user interactions safely with named actions.

Why Named Actions?
Instead of AI generating arbitrary code, it declares intent by name. Your application provides the implementation. This is a core guardrail.

Defining Actions
Define available actions in your catalog:

```ts
const catalog = createCatalog({
  components: {
    /* ... */
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
        filters: z
          .object({
            dateRange: z.string().optional(),
          })
          .optional(),
      }),
    },
    navigate: {
      params: z.object({
        url: z.string(),
      }),
    },
  },
});
```

ActionProvider
Provide action handlers to your app:

```ts
import { ActionProvider } from "@json-render/react";

function App() {
  const handlers = {
    submit_form: async (params) => {
      const response = await fetch("/api/submit", {
        method: "POST",
        body: JSON.stringify({ formId: params.formId }),
      });
      return response.json();
    },

    export_data: async (params) => {
      const blob = await generateExport(params.format, params.filters);
      downloadBlob(blob, `export.${params.format}`);
    },

    navigate: (params) => {
      window.location.href = params.url;
    },
  };

  return <ActionProvider handlers={handlers}>{/* Your UI */}</ActionProvider>;
}
```

Using Actions in Components

```ts
const Button = ({ element, onAction }) => (
  <button onClick={() => onAction(element.props.action, {})}>
    {element.props.label}
  </button>
);

// Or use the useAction hook
import { useAction } from "@json-render/react";

function SubmitButton() {
  const submitForm = useAction("submit_form");

  return (
    <button onClick={() => submitForm({ formId: "contact" })}>Submit</button>
  );
}
```

Actions with Confirmation
AI can declare actions that require user confirmation:

```ts
{
  "type": "Button",
  "props": {
    "label": "Delete Account",
    "action": {
      "name": "delete_account",
      "params": { "userId": "123" },
      "confirm": {
        "title": "Delete Account?",
        "message": "This action cannot be undone.",
        "variant": "danger"
      }
    }
  }
}
```

Action Callbacks
Handle success and error states:

```ts
{
  "type": "Button",
  "props": {
    "label": "Save",
    "action": {
      "name": "save_changes",
      "params": { "documentId": "doc-1" },
      "onSuccess": {
        "set": { "/ui/savedMessage": "Changes saved!" }
      },
      "onError": {
        "set": { "/ui/errorMessage": "$error.message" }
      }
    }
  }
}
```
