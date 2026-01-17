/**
 * Catalog builder for generative UI components
 * Creates type-safe component/action registries with prompt generation
 */

import { z } from 'zod'
import type { UIElement, UITree, VisibilityCondition } from '@yapmate/core/generative-ui'

/**
 * Component definition in the catalog
 */
export type ComponentDefinition = {
  props: z.ZodObject<z.ZodRawShape>
  hasChildren: boolean
  description: string
}

/**
 * Action definition in the catalog
 */
export type ActionDefinition = {
  params: z.ZodObject<z.ZodRawShape>
  description: string
}

/**
 * Catalog configuration input
 */
export type CatalogConfig<
  C extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>,
  A extends Record<string, ActionDefinition> = Record<string, ActionDefinition>
> = {
  name: string
  components: C
  actions: A
}

/**
 * Visibility condition schema
 */
const visibilityConditionSchema: z.ZodType<VisibilityCondition> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.object({ path: z.string() }),
    z.object({ path: z.string(), eq: z.unknown() }),
    z.object({ path: z.string(), neq: z.unknown() }),
    z.object({ path: z.string(), gt: z.number() }),
    z.object({ path: z.string(), gte: z.number() }),
    z.object({ path: z.string(), lt: z.number() }),
    z.object({ path: z.string(), lte: z.number() }),
    z.object({ auth: z.enum(['signedIn', 'signedOut']) }),
    z.object({ and: z.array(visibilityConditionSchema) }),
    z.object({ or: z.array(visibilityConditionSchema) }),
    z.object({ not: visibilityConditionSchema }),
  ])
)

/**
 * Format Zod schema shape for prompt
 */
function formatPropsForPrompt(schema: z.ZodObject<z.ZodRawShape>): string {
  try {
    const shape = schema.shape
    const props: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodTypeAny
      let typeStr = 'unknown'
      let desc = ''

      // Try to get description
      if (zodValue.description) {
        desc = ` // ${zodValue.description}`
      }

      // Determine type string based on Zod type
      if (zodValue instanceof z.ZodString) {
        typeStr = 'string'
      } else if (zodValue instanceof z.ZodNumber) {
        typeStr = 'number'
      } else if (zodValue instanceof z.ZodBoolean) {
        typeStr = 'boolean'
      } else if (zodValue instanceof z.ZodArray) {
        typeStr = 'array'
      } else if (zodValue instanceof z.ZodObject) {
        typeStr = 'object'
      } else if (zodValue instanceof z.ZodEnum) {
        const values = (zodValue as any)._def?.values
        if (Array.isArray(values)) {
          typeStr = values.map((v: string) => `"${v}"`).join(' | ')
        }
      } else if (zodValue instanceof z.ZodUnion) {
        typeStr = 'union'
      } else if (zodValue instanceof z.ZodNullable) {
        typeStr = 'nullable'
      } else if (zodValue instanceof z.ZodOptional) {
        typeStr = 'optional'
      }

      props.push(`${key}: ${typeStr}${desc}`)
    }

    return `{ ${props.join(', ')} }`
  } catch {
    return '{ ... }'
  }
}

/**
 * Generate system prompt from catalog
 */
function generatePrompt<
  C extends Record<string, ComponentDefinition>,
  A extends Record<string, ActionDefinition>
>(config: CatalogConfig<C, A>): string {
  let prompt = `You generate UI as JSON patches (JSONL format). Output one JSON object per line. No markdown, no explanation, no code blocks.

## Patch Operations

1. Set root element:
   {"op":"set","path":"/root","value":"<element-key>"}

2. Add element:
   {"op":"add","path":"/elements/<key>","value":{"key":"<key>","type":"<Type>","props":{...}}}

3. Update element prop:
   {"op":"replace","path":"/elements/<key>/props/<prop>","value":<value>}

4. Add children to element:
   {"op":"replace","path":"/elements/<key>/children","value":["child-key-1","child-key-2"]}

## Element Structure

Each element has:
- key: unique identifier (e.g. "card-1", "metric-revenue")
- type: component type from list below
- props: component-specific properties
- children: array of child element keys (for layout components)
- visible: optional visibility condition

## Available Components

`

  for (const [name, def] of Object.entries(config.components)) {
    const propsDesc = formatPropsForPrompt(def.props)
    prompt += `### ${name}
${def.description}
${def.hasChildren ? 'Accepts children: yes' : 'Accepts children: no'}
Props: ${propsDesc}

`
  }

  if (Object.keys(config.actions).length > 0) {
    prompt += `## Available Actions

Actions can be attached to interactive elements via the "action" prop.

`
    for (const [name, def] of Object.entries(config.actions)) {
      const paramsDesc = formatPropsForPrompt(def.params)
      prompt += `### ${name}
${def.description}
Params: ${paramsDesc}

`
    }
  }

  prompt += `## Data Binding

Props can use dynamic values that resolve at render time:
- Static: "value" or 123
- Path binding: {"path": "/data/users/count"} - resolves from data context
- Template: {"template": "Hello {/user/name}!"} - string interpolation

## Visibility Conditions

Elements can have conditional visibility:
- Always visible: omit "visible" or set to true
- Hidden: {"visible": false}
- Path truthy: {"visible": {"path": "/data/showDetails"}}
- Equality: {"visible": {"path": "/status", "eq": "active"}}
- Comparison: {"visible": {"path": "/count", "gt": 0}}
- Logic: {"visible": {"and": [...]}} or {"visible": {"or": [...]}}

## Rules

1. First patch MUST set root: {"op":"set","path":"/root","value":"<key>"}
2. Each element needs a unique key
3. Reference children by key strings in the children array
4. Output one valid JSON object per line
5. No trailing commas, no comments
6. For layouts, add children AFTER adding the child elements
`

  return prompt
}

/**
 * Build element schema from component definitions
 */
function buildElementSchema<C extends Record<string, ComponentDefinition>>(
  components: C
): z.ZodType<UIElement> {
  const componentSchemas = Object.entries(components).map(([type, def]) => {
    const baseShape = {
      key: z.string(),
      type: z.literal(type),
      props: def.props,
      visible: visibilityConditionSchema.optional(),
    }

    if (def.hasChildren) {
      return z.object({ ...baseShape, children: z.array(z.string()).optional() })
    }

    return z.object(baseShape)
  })

  if (componentSchemas.length === 0) {
    return z.object({
      key: z.string(),
      type: z.string(),
      props: z.record(z.string(), z.unknown()),
      children: z.array(z.string()).optional(),
      visible: visibilityConditionSchema.optional(),
    }) as z.ZodType<UIElement>
  }

  if (componentSchemas.length === 1) {
    return componentSchemas[0] as z.ZodType<UIElement>
  }

  return z.union([componentSchemas[0], componentSchemas[1], ...componentSchemas.slice(2)]) as z.ZodType<UIElement>
}

/**
 * Build tree schema
 */
function buildTreeSchema(elementSchema: z.ZodType<UIElement>) {
  return z.object({
    root: z.string(),
    elements: z.record(z.string(), elementSchema),
  })
}

/**
 * Build patch schema
 */
function buildPatchSchema(elementSchema: z.ZodType<UIElement>) {
  return z.discriminatedUnion('op', [
    z.object({ op: z.literal('set'), path: z.literal('/root'), value: z.string() }),
    z.object({ op: z.literal('add'), path: z.string(), value: elementSchema }),
    z.object({ op: z.literal('replace'), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal('remove'), path: z.string() }),
  ])
}

/**
 * Safe parse result type
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError }

/**
 * Created catalog instance
 */
export type Catalog<
  C extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>,
  A extends Record<string, ActionDefinition> = Record<string, ActionDefinition>
> = {
  name: string
  components: C
  actions: A
  schemas: {
    element: z.ZodType<UIElement>
    tree: z.ZodType<UITree>
    patch: z.ZodType
  }
  generatePrompt: () => string
  validateElement: (element: unknown) => SafeParseResult<UIElement>
  validateTree: (tree: unknown) => SafeParseResult<UITree>
  validatePatch: (patch: unknown) => SafeParseResult<unknown>
  getComponentTypes: () => string[]
  getActionNames: () => string[]
}

/**
 * Create a type-safe UI catalog
 */
export function createCatalog<
  C extends Record<string, ComponentDefinition>,
  A extends Record<string, ActionDefinition>
>(config: CatalogConfig<C, A>): Catalog<C, A> {
  const elementSchema = buildElementSchema(config.components)
  const treeSchema = buildTreeSchema(elementSchema)
  const patchSchema = buildPatchSchema(elementSchema)

  return {
    name: config.name,
    components: config.components,
    actions: config.actions,
    schemas: {
      element: elementSchema,
      tree: treeSchema,
      patch: patchSchema,
    },
    generatePrompt: () => generatePrompt(config),
    validateElement: (element) => elementSchema.safeParse(element) as SafeParseResult<UIElement>,
    validateTree: (tree) => treeSchema.safeParse(tree) as SafeParseResult<UITree>,
    validatePatch: (patch) => patchSchema.safeParse(patch) as SafeParseResult<unknown>,
    getComponentTypes: () => Object.keys(config.components),
    getActionNames: () => Object.keys(config.actions),
  }
}

/**
 * Helper to create a component definition with type inference
 */
export function defineComponent(config: ComponentDefinition): ComponentDefinition {
  return config
}

/**
 * Helper to create an action definition with type inference
 */
export function defineAction(config: ActionDefinition): ActionDefinition {
  return config
}
