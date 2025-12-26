---
name: Mobile Chat Implementation
overview: Implement individual chat view route `/chat/[id]` with message display and input for React Native Expo app, using `@ai-sdk/react` with `DefaultChatTransport` configured for Expo streaming.
todos:
  - id: install-deps
    content: Install @ai-sdk/react, ai packages and polyfills in mobile app
    status: pending
  - id: create-polyfills
    content: Create polyfills.ts file and import in root _layout.tsx
    status: pending
    dependencies:
      - install-deps
  - id: create-api-url-util
    content: Create api-url.ts utility for generating API URLs with expo/fetch support
    status: pending
  - id: create-chat-helpers
    content: Create chat-helpers.ts with createChat and basic helper functions
    status: pending
  - id: create-chat-input
    content: Create chat-input.tsx component with TextInput and send button
    status: pending
  - id: create-messages-history
    content: Create messages-history.tsx component with FlatList for message display
    status: pending
  - id: create-chat-component
    content: Create chat.tsx main component using useChat hook with DefaultChatTransport
    status: pending
    dependencies:
      - create-api-url-util
      - create-chat-helpers
      - create-chat-input
      - create-messages-history
  - id: create-chat-route
    content: Create /chat/[id].tsx route that fetches initial messages and renders Chat component
    status: pending
    dependencies:
      - create-chat-component
---

# Mobile Chat Implementation Plan

## Overview

Create the `/chat/[id]` route and implement message display and input components for the React Native Expo app, adapting the web app's chat functionality to work with Expo's streaming capabilities.

## Architecture

The implementation will follow this flow:

```javascript
User navigates to /chat/[id]
  ↓
ChatScreen loads initial messages via RPC
  ↓
Chat component uses @ai-sdk/react with DefaultChatTransport
  ↓
Transport uses expo/fetch for streaming
  ↓
Messages displayed in FlatList
  ↓
User input handled via TextInput
```



## Key Files to Create/Modify

### 1. Route: `apps/mobile/src/app/(app)/chat/[id].tsx`

- New file: Individual chat screen route
- Uses Expo Router dynamic route `[id]`
- Fetches initial messages via `rpcClient.messages.list()`
- Renders `Chat` component with initial messages
- Handles loading and error states

### 2. Component: `apps/mobile/src/components/chat/chat.tsx`

- New file: Main chat component (adapted from web)
- Uses `useChat` from `@ai-sdk/react`
- Configures `DefaultChatTransport` with `expo/fetch`
- Manages chat state, message streaming, and chat creation
- Handles resume stream logic (simplified - no resume for basic version)
- Integrates with `ChatInput` and `MessagesHistory` components

### 3. Component: `apps/mobile/src/components/chat/chat-input.tsx`

- New file: Chat input component (React Native version)
- Uses React Native `TextInput` (or `Textarea` component)
- Handles text input and submission
- Shows send button (disabled during streaming)
- Basic styling with NativeWind

### 4. Component: `apps/mobile/src/components/chat/messages-history.tsx`

- New file: Messages display component
- Uses React Native `FlatList` for message rendering
- Renders user and assistant messages
- Handles text parts (basic version - no reasoning/file parts initially)
- Simple message styling

### 5. Utility: `apps/mobile/src/lib/api-url.ts`

- New file: API URL generator utility
- Similar to Expo doc's `generateAPIUrl`
- Handles development (localhost) and production (EXPO_PUBLIC_API_URL)
- Returns full URL for `/api/chat` endpoint

### 6. Helper: `apps/mobile/src/components/chat/chat-helpers.ts`

- New file: Chat helper functions
- `createChat` - creates chat via RPC
- `determineDefaultModel` - sets default model (simplified for basic version)
- Stream resume logic (can be simplified or skipped for basic)

### 7. Dependencies: `apps/mobile/package.json`

- Add `@ai-sdk/react` package
- Add `ai` package (if not already present)
- Add `expo/fetch` (should be available in Expo 54)
- Add polyfills if needed: `@ungap/structured-clone`, `@stardazed/streams-text-encoding`

### 8. Polyfills: `apps/mobile/src/polyfills.ts`

- New file: Polyfills for React Native
- Sets up `structuredClone`, `TextEncoderStream`, `TextDecoderStream`
- Imported in root `_layout.tsx`

## Implementation Details

### Chat Transport Configuration

```typescript
new DefaultChatTransport({
  fetch: expoFetch as unknown as typeof globalThis.fetch,
  api: generateAPIUrl('/api/chat'),
  prepareSendMessagesRequest({ messages, id }) {
    return {
      body: {
        message: messages.at(-1),
        id,
        model: modelRef.current,
        // Basic version - no searchEnabled, regenerate, edit
      },
    };
  },
})
```



### Message Types

- Use `ChatUIMessage` type from `@yapmate/server/routes/api/chat/types`
- Handle text parts only (basic version)
- Message structure: `{ id, role, parts: [{ type: 'text', text: string }] }`

### State Management

- `useChat` hook manages messages and streaming state
- React Query for initial message fetching
- Local state for input, model (hardcoded fallback for basic)

### Navigation

- Expo Router handles route: `/chat/[id]`
- Chat context already provides `navigateToChat` function
- Back navigation handled by Expo Router

## Differences from Web App

1. **No model selector** - Use hardcoded fallback model for basic version
2. **No file attachments** - Text input only
3. **No search toggle** - Basic chat only
4. **No edit/regenerate** - Basic message display only
5. **No resume stream** - Simplified (can add later)
6. **React Native components** - `FlatList`, `TextInput` instead of web components
7. **Expo fetch** - Use `expo/fetch` instead of native fetch

## Testing Considerations

- Test streaming works with `expo/fetch`
- Verify authentication headers are passed correctly
- Test chat creation on first message
- Test navigation between chats
- Verify messages persist after navigation

## Future Enhancements (Not in Scope)

- Model selector dropdown
- File attachment support
- Search/web toggle
- Message editing/regeneration