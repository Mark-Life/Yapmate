---
name: Mobile Chat Input Parity
overview: Bring the mobile chat input to full feature parity with the desktop version, adding model selector, voice transcription, file attachments, search toggle, icons, and improved visual structure.
todos:
  - id: deps
    content: Install expo-av, expo-image-picker, expo-document-picker
    status: pending
  - id: use-models
    content: Create use-models.ts hook for mobile
    status: pending
  - id: model-selector
    content: Create ModelSelector component using RN Select primitives
    status: pending
  - id: transcribe-button
    content: Create TranscribeButton with expo-av audio recording
    status: pending
  - id: attachment-button
    content: Create AttachmentButton with image/document picker
    status: pending
  - id: attachments-display
    content: Create AttachmentsDisplay component for header area
    status: pending
  - id: refactor-chat-input
    content: Refactor ChatInput with new structure, icons, and props
    status: pending
  - id: update-chat
    content: Update Chat component with new state and prop wiring
    status: pending
---

# Mobile Chat Input - Full Desktop Parity

## Overview

Transform the basic mobile chat input into a feature-rich component matching the desktop version.

## Current State

**Mobile** ([apps/mobile/src/components/chat/chat-input.tsx](apps/mobile/src/components/chat/chat-input.tsx)):

- Basic View + Textarea + Button layout
- Text labels ("Send"/"Stop")
- No additional features

**Desktop** ([apps/web/src/client/components/chat/chat-input.tsx](apps/web/src/client/components/chat/chat-input.tsx)):

- Header/Body/Footer structure with `PromptInput` components
- Icons for submit states
- Model selector, voice transcription, file attachments, search toggle
- Token usage indicator

## Implementation Plan

### Phase 1: Dependencies

Install required Expo packages:

- `expo-av` - audio recording for voice transcription
- `expo-image-picker` - image/file attachments
- `expo-document-picker` - document attachments

### Phase 2: Core Infrastructure

**1. Create `use-models.ts` hook** in `apps/mobile/src/hooks/`

Copy logic from web version:

```typescript
// apps/web/src/client/hooks/use-models.ts
export const useModels = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModelsFromApi,
    // ...
  });
};
```

Adapt for mobile's existing `rpcClient`.

**2. Create shared types** for attachments:

```typescript
type Attachment = {
  id: string;
  uri: string;
  type: "image" | "file";
  name: string;
  mimeType?: string;
};
```

### Phase 3: New Components

Create in `apps/mobile/src/components/chat/`:

- `model-selector.tsx` - Using existing `Select` primitives from `@/components/ui/select`
- `transcribe-button.tsx` - Audio recording via expo-av, calls `/api/transcribe`
- `attachment-button.tsx` - Opens image/document picker
- `attachments-display.tsx` - Shows attached files in header area

### Phase 4: Refactor ChatInput

Update `chat-input.tsx` with:

**New props** (matching desktop):

- `model`, `onModelChange`
- `searchEnabled`, `onSearchEnabledChange`  
- `onSubmit: (message: { text: string; files: Attachment[] }) => void`
- `chatId` (for autofocus)

**New structure**:

```
┌─────────────────────────────────────┐
│ Header (attachments display)         │
├─────────────────────────────────────┤
│ Body (textarea)                      │
├─────────────────────────────────────┤
│ Footer                              │
│ [Mic][Model▼][Attach][Search] [Send]│
└─────────────────────────────────────┘
```

**Icon-based submit button**:

- `CornerDownLeft` (ready)
- `Loader2` (submitted)
- `Square` (streaming - stop)

### Phase 5: Update Chat Component

Modify `apps/mobile/src/components/chat/chat.tsx`:

- Add `model`, `setModel` state
- Add `searchEnabled`, `setSearchEnabled` state  
- Add attachments state management
- Use `useModels()` hook
- Pass new props to ChatInput
- Update transport's `prepareSendMessagesRequest` to include `searchEnabled`
- Handle attachments in `handleSubmit`

## Files to Create

- `apps/mobile/src/hooks/use-models.ts`
- `apps/mobile/src/components/chat/model-selector.tsx`
- `apps/mobile/src/components/chat/transcribe-button.tsx`
- `apps/mobile/src/components/chat/attachment-button.tsx`
- `apps/mobile/src/components/chat/attachments-display.tsx`

## Files to Modify

- `apps/mobile/package.json` - add expo-av, expo-image-picker, expo-document-picker
- `apps/mobile/src/components/chat/chat-input.tsx` - complete refactor
- `apps/mobile/src/components/chat/chat.tsx` - add state and props

## Key Considerations

- Use existing mobile UI primitives (`Select`, `Button`, `Icon`) 
- Reuse `rpcClient` for API calls
- Follow existing mobile styling patterns with NativeWind
- Keep file under 400 lines - extract sub-components as needed