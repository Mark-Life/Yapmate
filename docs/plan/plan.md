# Chat UI Development Plan

## Core Architecture

### Tool Handling

- [ ] Implement tool call handling system:
  - [ ] Detect and handle tool calls from models
  - [ ] Display tool call execution status
  - [ ] Show tool call results in UI
- [ ] Add UI toggle/option to enable web search when available for selected model

### System Prompts

- [ ] Implement global system prompt that applies to all models and all messages
- [ ] Create system prompt constructor/combiner:
  - [ ] Combine global system prompt with model-specific prompts
  - [ ] Handle model-specific quirks and constraints (e.g., "don't use certain symbols", formatting requirements)
  - [ ] Apply model-specific system prompt additions based on selected model
- [ ] (Optional) Add UI to expose system prompt to users:
  - [ ] Add button/option to view the full system prompt for a conversation
  - [ ] Display combined system prompt (global + model-specific) in read-only view
  - [ ] Allow users to understand the context without ability to edit

## Features

### Basic Chat Features

- [ ] Improve message rendering for different message types
- [ ] Add visual indicators for tool calls
- [ ] Enhance error state display
- [ ] Improve loading states during streaming

### File Attachments

- [x] Add file upload/attachment UI component
- [x] Implement file attachment handling in message input
- [x] Display attached files in messages with previews for images, button to remove from imput (unattaching)
- [x] Drag and drop
- [ ] Handle file processing and sending to model
- [ ] Add other files types support like code files

### User Preferences & Data

- [ ] Implement user data system (prerequisite for last-used model feature)
- [ ] Add functionality to remember and use the last model the user selected
- [ ] Store user preferences (model selection, settings, etc.)
- [ ] Implement preference persistence

### Branching

- [ ] branching support
- [ ] parallel runs

### Voice Features

- [ ] Enable both ways voice communication (user voice input and model voice output)

## Advanced Agent Capabilities

### Deep Research Pipeline

- [ ] Design and implement agent pipeline system for deep research:
  - [ ] Enable/disable research pipeline separately from regular chat
  - [ ] Research query input and processing
  - [ ] Multi-step research workflow orchestration
- [ ] Implement web research capabilities:
  - [ ] Internet search and information gathering
  - [ ] Source collection and citation tracking
  - [ ] Information synthesis and fact-checking
- [ ] Document generation system:
  - [ ] Generate structured research documents from findings
  - [ ] Include citations and source references
  - [ ] Format documents for readability (markdown, structured sections)
  - [ ] Save research documents for later access
- [ ] Research document discussion:
  - [ ] Enable follow-up questions on generated research documents
  - [ ] Context-aware Q&A based on research content
  - [ ] Link research documents to chat conversations
  - [ ] Document versioning and update tracking

---

## Workspaces & File System (Future Idea)

### Workspace Concept

- [ ] Implement workspace system (similar to Cursor's workspace functionality)
- [ ] Create workspace structure with file directories
- [ ] Support multiple workspaces per user
- [ ] Workspace management UI (create, switch, delete workspaces)

### File System Integration

- [ ] Built-in file system browser/explorer UI
- [ ] Support for multiple file types:
  - [ ] Text files (markdown, plain text, code files)
  - [ ] Data files (CSV, JSON, etc.)
  - [ ] Documents (articles, notes, etc.)
- [ ] File operations:
  - [ ] Create files and directories
  - [ ] Edit files (with syntax highlighting)
  - [ ] Delete files
  - [ ] Rename files and directories
  - [ ] Move/copy files

### Agent File Editing

- [ ] Enable agent to read files from workspace
- [ ] Enable agent to edit files in workspace
- [ ] Agent can create new files based on user requests
- [ ] Show file changes/diffs when agent edits files
- [ ] File change history/versioning

### Agent Rules & Configuration

- [ ] Allow users to create agent rules per workspace
- [ ] Workspace-specific agent behavior configuration
- [ ] Rule management UI (create, edit, delete rules)
- [ ] Rule application and enforcement system

### Use Cases

- [ ] Project-based workflows:
  - [ ] Working with CSV data files
  - [ ] Managing multiple article pieces/drafts
  - [ ] Creating new documents from existing files
  - [ ] Code projects with multiple files
- [ ] Multi-file collaboration with agent
- [ ] Context-aware agent assistance based on workspace files
