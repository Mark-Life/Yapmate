Components
Register React components to render your catalog types.

Component Registry
Create a registry that maps catalog component types to React components:

```ts
const registry = {
  Card: ({ element, children }) => (
    <div className="card">
      <h2>{element.props.title}</h2>
      {element.props.description && <p>{element.props.description}</p>}
      {children}
    </div>
  ),

  Button: ({ element, onAction }) => (
    <button onClick={() => onAction(element.props.action, {})}>
      {element.props.label}
    </button>
  ),
};
```

Component Props
Each component receives these props:

```ts
interface ComponentProps {
  element: {
    key: string;
    type: string;
    props: Record<string, unknown>;
    children?: UIElement[];
    visible?: VisibilityCondition;
    validation?: ValidationSchema;
  };
  children?: React.ReactNode; // Rendered children
  onAction: (name: string, params: object) => void;
}
```

Using Data Binding
Use hooks to read and write data:

```ts
import { useDataValue, useDataBinding } from "@json-render/react";

const Metric = ({ element }) => {
  // Read-only value
  const value = useDataValue(element.props.valuePath);

  return (
    <div className="metric">
      <span className="label">{element.props.label}</span>
      <span className="value">{formatValue(value)}</span>
    </div>
  );
};

const TextField = ({ element }) => {
  // Two-way binding
  const [value, setValue] = useDataBinding(element.props.valuePath);

  return (
    <input
      value={value || ""}
      onChange={(e) => setValue(e.target.value)}
      placeholder={element.props.placeholder}
    />
  );
};
```

Using the Renderer

```ts
import { Renderer } from "@json-render/react";

function App() {
  return <Renderer tree={uiTree} registry={registry} />;
}
```
