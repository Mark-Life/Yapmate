Validation
Validate form inputs with built-in and custom functions.

Built-in Validators
json-render includes common validation functions:

required — Value must be non-empty
email — Valid email format
minLength — Minimum string length
maxLength — Maximum string length
pattern — Match a regex pattern
min — Minimum numeric value
max — Maximum numeric value
Using Validation in JSON

```ts
{
  "type": "TextField",
  "props": {
    "label": "Email",
    "valuePath": "/form/email",
    "checks": [
      { "fn": "required", "message": "Email is required" },
      { "fn": "email", "message": "Invalid email format" }
    ],
    "validateOn": "blur"
  }
}
```

Validation with Parameters

```ts
{
  "type": "TextField",
  "props": {
    "label": "Password",
    "valuePath": "/form/password",
    "checks": [
      { "fn": "required", "message": "Password is required" },
      {
        "fn": "minLength",
        "args": { "length": 8 },
        "message": "Password must be at least 8 characters"
      },
      {
        "fn": "pattern",
        "args": { "pattern": "[A-Z]" },
        "message": "Must contain at least one uppercase letter"
      }
    ]
  }
}
```

Custom Validation Functions
Define custom validators in your catalog:

```ts
const catalog = createCatalog({
  components: {
    /* ... */
  },
  validationFunctions: {
    isValidPhone: {
      description: "Validates phone number format",
    },
    isUniqueEmail: {
      description: "Checks if email is not already registered",
    },
  },
});
```

Then implement them in your ValidationProvider:

```ts
import { ValidationProvider } from "@json-render/react";

function App() {
  const customValidators = {
    isValidPhone: (value) => {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(value);
    },
    isUniqueEmail: async (value) => {
      const response = await fetch(`/api/check-email?email=${value}`);
      const { available } = await response.json();
      return available;
    },
  };

  return (
    <ValidationProvider functions={customValidators}>
      {/* Your UI */}
    </ValidationProvider>
  );
}
```

Using in Components

```ts
import { useFieldValidation } from "@json-render/react";

function TextField({ element }) {
  const { value, setValue, errors, validate } = useFieldValidation(
    element.props.valuePath,
    element.props.checks
  );

  return (
    <div>
      <label>{element.props.label}</label>
      <input
        value={value || ""}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => validate()}
      />
      {errors.map((error, i) => (
        <p key={i} className="text-red-500 text-sm">
          {error}
        </p>
      ))}
    </div>
  );
}
```

Validation Timing
Control when validation runs with validateOn:

change — Validate on every input change
blur — Validate when field loses focus
submit — Validate only on form submission
