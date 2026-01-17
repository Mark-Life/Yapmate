# Mobile Message History Feature Gap Analysis

Comparison of web and mobile implementations to identify missing features in the mobile app.

## Related Files

### Mobile
- `apps/mobile/src/components/chat/messages-history.tsx` - Main message list component
- `apps/mobile/src/components/chat/message-item.tsx` - Individual message rendering
- `apps/mobile/src/components/chat/message-parts.tsx` - Text and file part components
- `apps/mobile/src/components/chat/message-actions.tsx` - Edit action buttons

### Web
- `apps/web/src/client/components/chat/messages-history.tsx` - Main message history with all part types
- `apps/web/src/client/components/chat/text-part.tsx` - Text part with actions, avatars, feedback
- `apps/web/src/client/components/chat/feedback-buttons.tsx` - Thumbs up/down feedback
- `apps/web/src/client/components/chat/member-list.tsx` - Typing indicators

### Shared AI Elements (packages/components/src/ai-elements/)
- `tool.tsx` - Tool invocation UI (collapsible with status badges)
- `reasoning.tsx` - Reasoning/thinking collapsible with duration tracking
- `message.tsx` - Message components, branching, attachments
- `loader.tsx` - Loading indicator component
- `model-selector.tsx` - Model picker with provider logos
- `code-block.tsx` - Code block rendering (used in tool output)

---

## Missing Features

### 1. Tool Call Rendering (High Priority) ✅ done

**Web has** (`messages-history.tsx:139-219`):
- Collapsible tool cards with `<Tool>`, `<ToolHeader>`, `<ToolContent>`
- Tool name extracted from type (e.g., `tool-search` → "search")
- Status badge showing state: pending, running, awaiting approval, completed, error, denied
- Input parameters display as JSON code block
- Output/error display with syntax highlighting
- Approval workflow UI with approve/deny buttons

**Mobile has** (`message-item.tsx:189`):
- Returns `null` for any part type that isn't `text` or `file`

**Files to create/modify**:
- Create: `apps/mobile/src/components/chat/tool-part.tsx`
- Modify: `apps/mobile/src/components/chat/message-item.tsx`

---

### 2. Reasoning/Thinking Parts (High Priority) ✅ done

**Web has** (`messages-history.tsx:75-90`, `reasoning.tsx`):
- Collapsible `<Reasoning>` component
- "Thinking..." with shimmer animation during streaming
- Auto-collapse after streaming completes (1s delay)
- Duration tracking ("Thought for X seconds")
- Markdown rendering of thinking content via Streamdown

**Mobile has** (`messages-history.tsx:137-141`):
- Only shows "Thinking..." text in `ListFooterComponent` when `status === "submitted"`
- No rendering of actual reasoning parts in message content

**Files to create/modify**:
- Create: `apps/mobile/src/components/chat/reasoning-part.tsx`
- Modify: `apps/mobile/src/components/chat/message-item.tsx`

---

### 3. Model Avatar/Logo for Assistant Messages ✅ for now only model name. decided not to do avatars for models

**Web has** (`messages-history.tsx:329-351`, `text-part.tsx:417-424`):
- Avatar component next to assistant messages
- Model provider logo from `https://models.dev/logos/{provider}.svg`
- Fallback to "AI" initials
- Provider extracted from model string (e.g., `openai/gpt-4` → `openai`)

**Mobile proposal**:
- Instead of avatar (limited horizontal space), show model info string under the response before action buttons
- Example: "gpt-4o · OpenAI" or just the model name

**Files to modify**:
- `apps/mobile/src/components/chat/message-item.tsx`
- `apps/mobile/src/components/chat/message-parts.tsx`

---

### 4. Multi-user Chat Support ✅ done

**Web has** (`messages-history.tsx:244-319`, `text-part.tsx:246-296`):
- `memberNames` map of userId → displayName
- `typingMembers` map for typing indicators
- User avatars with initials (`getInitials` function)
- Sender name display inside message bubble for other users
- Different styling for other users' messages (`isOtherUser` prop)
- `<TypingIndicator>` component showing who's typing

**Mobile has**:
- None - no multi-user props or logic

**Files to modify**:
- `apps/mobile/src/components/chat/messages-history.tsx` - Add props
- `apps/mobile/src/components/chat/message-item.tsx` - Add sender info
- `apps/mobile/src/components/chat/message-parts.tsx` - Add avatar/name display
- Create: `apps/mobile/src/components/chat/typing-indicator.tsx`

---

### 5. Feedback System

**Web has** (`feedback-buttons.tsx`, `text-part.tsx:234-240`):
- `<FeedbackButtons>` component with thumbs up/down
- `FeedbackState` type (0 | 1 | null)
- Langfuse integration via `sendFeedback` function
- Only shown for assistant messages

**Mobile has**:
- No feedback mechanism

**Files to create/modify**:
- Create: `apps/mobile/src/components/chat/feedback-buttons.tsx`
- Modify: `apps/mobile/src/components/chat/message-item.tsx`z

---

### 6. Regenerate with Model Selector UI

**Web has** (`text-part.tsx:88-145`):
- `<RegenerateWithModelMenu>` with context menu
- Right-click on retry button opens model selector
- Models grouped by provider with logos
- Search/filter functionality

**Mobile has** (`message-item.tsx:57-61`):
- Context menu action "Regenerate with model..."
- Triggers `onRequestModelForRegeneration` callback
- No in-place model picker UI (defers to parent)

**Files to consider**:
- Could enhance context menu or create bottom sheet model picker
- `apps/mobile/src/components/chat/message-item.tsx`

---

### 7. Message Branching

**Web has** (`message.tsx:111-307`):
- `<MessageBranch>` context provider
- `<MessageBranchContent>` for showing current branch
- `<MessageBranchSelector>` with prev/next buttons
- `<MessageBranchPage>` showing "X of Y"
- Supports multiple response versions per message

**Mobile has**:
- No branching support

**Files to create**:
- Create: `apps/mobile/src/components/chat/message-branch.tsx`
- Modify: `apps/mobile/src/components/chat/message-item.tsx`

---

### 8. Loader Component

**Web has** (`loader.tsx`, `messages-history.tsx:418,562`):
- Dedicated `<Loader />` component
- Shows when `status === "submitted"`
- Shows when streaming but no visible content yet

**Mobile has** (`messages-history.tsx:137-141`):
- Simple `<Text>Thinking...</Text>` in ListFooterComponent

**Files to modify**:
- Create: `apps/mobile/src/components/chat/loader.tsx` (animated version)
- Modify: `apps/mobile/src/components/chat/messages-history.tsx`

---

## Suggested Implementation Order

1. **Tool Call Rendering** - Critical for AI agent functionality
2. **Reasoning Parts** - Important for models with thinking (Claude, o1)
3. **Model Info Display** - Quick win, improves UX
4. **Loader Component** - Quick win, better loading state
5. **Multi-user Chat** - If needed for your use case
6. **Feedback System** - Nice to have for analytics
7. **Message Branching** - Lower priority
8. **Model Selector UI** - Current callback approach may be sufficient
