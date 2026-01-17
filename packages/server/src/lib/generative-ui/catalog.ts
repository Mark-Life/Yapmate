/**
 * Component catalog for generative UI
 * Defines all available components AI can generate
 */

import { z } from 'zod'
import { createCatalog } from './catalog-builder'

export const uiCatalog = createCatalog({
  name: 'generative-dashboard',

  components: {
    // Layout
    Grid: {
      props: z.object({
        columns: z.number().min(1).max(12).describe('Number of columns'),
        gap: z.number().nullable().describe('Gap between items in pixels'),
      }),
      hasChildren: true,
      description: 'Grid layout with configurable columns',
    },
    Stack: {
      props: z.object({
        direction: z.enum(['vertical', 'horizontal']).describe('Stack direction'),
        gap: z.number().nullable().describe('Gap between items in pixels'),
      }),
      hasChildren: true,
      description: 'Flex stack layout',
    },
    Card: {
      props: z.object({
        title: z.string().nullable().describe('Card title'),
        subtitle: z.string().nullable().describe('Card subtitle'),
      }),
      hasChildren: true,
      description: 'Container card with optional title',
    },

    // Data Display
    DataTable: {
      props: z.object({
        data: z.array(z.record(z.string(), z.unknown())).describe('Array of objects to display'),
        columns: z
          .array(
            z.object({
              key: z.string().describe('Object key to display'),
              label: z.string().describe('Column header label'),
              format: z
                .enum(['text', 'number', 'date', 'currency'])
                .nullable()
                .describe('Display format'),
            })
          )
          .describe('Column definitions'),
        pageSize: z.number().nullable().describe('Rows per page'),
      }),
      hasChildren: false,
      description: 'Table for any array of objects',
    },
    Metric: {
      props: z.object({
        label: z.string().describe('Metric label'),
        value: z.union([z.string(), z.number()]).describe('Metric value'),
        change: z.string().nullable().describe("Change indicator (e.g., '+5%')"),
        changeType: z
          .enum(['positive', 'negative', 'neutral'])
          .nullable()
          .describe('Change sentiment'),
      }),
      hasChildren: false,
      description: 'Single metric display with optional change indicator',
    },
    Chart: {
      props: z.object({
        type: z.enum(['bar', 'line', 'pie', 'area']).describe('Chart type'),
        data: z.array(z.record(z.string(), z.unknown())).describe('Chart data points'),
        xKey: z.string().describe('Key for X axis values'),
        yKey: z.string().describe('Key for Y axis values'),
        title: z.string().nullable().describe('Chart title'),
      }),
      hasChildren: false,
      description: 'Chart visualization',
    },

    // Content
    TextBlock: {
      props: z.object({
        content: z.string().describe('Markdown text content'),
        variant: z.enum(['body', 'heading', 'caption']).nullable().describe('Text style'),
      }),
      hasChildren: false,
      description: 'Markdown text block',
    },
    List: {
      props: z.object({
        items: z.array(z.string()).describe('List items'),
        ordered: z.boolean().nullable().describe('Use numbered list'),
      }),
      hasChildren: false,
      description: 'Bullet or numbered list',
    },
    KeyValue: {
      props: z.object({
        pairs: z
          .array(
            z.object({
              key: z.string().describe('Label'),
              value: z.string().describe('Value'),
            })
          )
          .describe('Key-value pairs'),
      }),
      hasChildren: false,
      description: 'Key-value pairs display',
    },

    // Interactive
    Button: {
      props: z.object({
        label: z.string().describe('Button label'),
        variant: z.enum(['primary', 'secondary', 'outline']).nullable().describe('Button style'),
        action: z
          .object({
            name: z.string(),
            params: z.record(z.string(), z.unknown()).optional(),
          })
          .nullable()
          .describe('Action to trigger on click'),
      }),
      hasChildren: false,
      description: 'Action button',
    },

    // Specialized
    FlashCard: {
      props: z.object({
        front: z.string().describe('Front side content'),
        back: z.string().describe('Back side content (answer)'),
        hint: z.string().nullable().describe('Optional hint'),
        category: z.string().nullable().describe('Category tag'),
      }),
      hasChildren: false,
      description: 'Interactive flashcard for learning',
    },
    FlashCardDeck: {
      props: z.object({
        title: z.string().describe('Deck title'),
        cards: z
          .array(
            z.object({
              front: z.string().describe('Front side'),
              back: z.string().describe('Back side'),
              hint: z.string().nullable().describe('Hint'),
            })
          )
          .describe('Cards in the deck'),
      }),
      hasChildren: false,
      description: 'Collection of flashcards with navigation',
    },
  },

  actions: {
    export_csv: {
      description: 'Export data as CSV file',
      params: z.object({
        data: z.array(z.record(z.string(), z.unknown())).describe('Data to export'),
        filename: z.string().describe('Output filename'),
      }),
    },
    export_json: {
      description: 'Export data as JSON file',
      params: z.object({
        data: z.unknown().describe('Data to export'),
        filename: z.string().describe('Output filename'),
      }),
    },
    refresh_data: {
      description: 'Re-fetch data from source',
      params: z.object({
        sourceId: z.string().describe('Source identifier'),
      }),
    },
    drill_down: {
      description: 'Show detailed view of selected item',
      params: z.object({
        item: z.record(z.string(), z.unknown()).describe('Item to inspect'),
      }),
    },
    flip_card: {
      description: 'Flip flashcard to see answer',
      params: z.object({
        cardIndex: z.number().describe('Card index'),
      }),
    },
    next_card: {
      description: 'Move to next flashcard',
      params: z.object({
        direction: z.enum(['next', 'prev']).describe('Navigation direction'),
      }),
    },
  },
})

export type UICatalog = typeof uiCatalog
