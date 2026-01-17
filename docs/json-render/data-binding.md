Data Binding
Connect UI components to your application data using JSON Pointer paths.

JSON Pointer Paths
json-render uses JSON Pointer (RFC 6901) for data paths:

```ts
// Given this data:
{
  "user": {
    "name": "Alice",
    "email": "alice@example.com"
  },
  "metrics": {
    "revenue": 125000,
    "growth": 0.15
  }
}
```

// These paths access:
"/user/name" -> "Alice"
"/metrics/revenue" -> 125000
"/metrics/growth" -> 0.15
DataProvider
Wrap your app with DataProvider to enable data binding:

```ts
import { DataProvider } from "@json-render/react";

function App() {
  const initialData = {
    user: { name: "Alice" },
    form: { email: "", message: "" },
  };

  return <DataProvider initialData={initialData}>{/* Your UI */}</DataProvider>;
}
```

Reading Data
Use useDataValue for read-only access:

```ts
import { useDataValue } from "@json-render/react";

function UserGreeting() {
  const name = useDataValue("/user/name");
  return <h1>Hello, {name}!</h1>;
}
```

Two-Way Binding
Use useDataBinding for read-write access:

```ts
import { useDataBinding } from "@json-render/react";

function EmailInput() {
  const [email, setEmail] = useDataBinding("/form/email");

  return (
    <input
      type="email"
      value={email || ""}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}
```

Using the Data Context
Access the full data context for advanced use cases:

```ts
import { useData } from "@json-render/react";

function DataDebugger() {
  const { data, setData, getValue, setValue } = useData();

  // Read any path
  const revenue = getValue("/metrics/revenue");

  // Write any path
  const updateRevenue = () => setValue("/metrics/revenue", 150000);

  // Replace all data
  const resetData = () => setData({ user: {}, form: {} });

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

In JSON UI Trees
AI can reference data paths in component props:

```ts
{
  "type": "Metric",
  "props": {
    "label": "Total Revenue",
    "valuePath": "/metrics/revenue",
    "format": "currency"
  }
}
```
