"use client";

import { useChat } from "@ai-sdk/react";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputAddFileButton,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { DragDropZone } from "@/components/drag-drop-zone";
import { MODELS, parseModel } from "@/lib/models";
import { cn } from "@/lib/utils";

const models = MODELS.map((value) => ({
  name: parseModel(value).modelName,
  value,
}));

const Chat = () => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { messages, sendMessage, status, regenerate } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model,
          searchEnabled,
        },
      }
    );
    setInput("");
  };

  return (
    <PromptInputProvider initialInput={input}>
      <div
        className={cn(
          "relative mx-auto size-full h-screen max-w-4xl p-6 transition-all",
          isDragging && "rounded-lg border-2 border-primary border-dashed"
        )}
        ref={containerRef}
      >
        <DragDropZone containerRef={containerRef} setIsDragging={setIsDragging}>
          <div className="flex h-full flex-col">
            <Conversation className="h-full">
              <ConversationContent>
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Message
                              from={message.role}
                              key={`${message.id}-${i}`}
                            >
                              <MessageContent>
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                              {message.role === "assistant" &&
                                i === messages.length - 1 && (
                                  <MessageActions>
                                    <MessageAction
                                      label="Retry"
                                      onClick={() => regenerate()}
                                    >
                                      <RefreshCcwIcon className="size-3" />
                                    </MessageAction>
                                    <MessageAction
                                      label="Copy"
                                      onClick={() =>
                                        navigator.clipboard.writeText(part.text)
                                      }
                                    >
                                      <CopyIcon className="size-3" />
                                    </MessageAction>
                                  </MessageActions>
                                )}
                            </Message>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              className="w-full"
                              isStreaming={
                                status === "streaming" &&
                                i === message.parts.length - 1 &&
                                message.id === messages.at(-1)?.id
                              }
                              key={`${message.id}-${i}`}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                ))}
                {status === "submitted" && <Loader />}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <PromptInput
              className="mt-4 rounded-md border border-primary/10 bg-primary/5"
              multiple
              onSubmit={handleSubmit}
            >
              <PromptInputHeader>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
              </PromptInputHeader>
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputSelect
                    onValueChange={(value) => {
                      setModel(value);
                    }}
                    value={model}
                  >
                    <PromptInputSelectTrigger>
                      <PromptInputSelectValue />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {models.map((modelItem) => (
                        <PromptInputSelectItem
                          key={modelItem.value}
                          value={modelItem.value}
                        >
                          {modelItem.name}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                  <PromptInputAddFileButton />
                  <PromptInputButton
                    aria-label="Toggle search"
                    onClick={() => setSearchEnabled((prev) => !prev)}
                    variant={searchEnabled ? "default" : "ghost"}
                  >
                    <GlobeIcon className="size-4" />
                  </PromptInputButton>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!(input || status)}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </DragDropZone>
      </div>
    </PromptInputProvider>
  );
};

export default Chat;
