CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"firstName" text,
	"lastName" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"title" text,
	"parentChatId" uuid,
	"branchPointMessageId" uuid,
	"activeStreamId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" text NOT NULL,
	"model" text,
	"order" integer NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"messageId" uuid NOT NULL,
	"type" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"text_content" text,
	"reasoning_content" text,
	"source_url" text,
	"source_title" text,
	"tool_callId" text,
	"tool_name" text,
	"tool_state" text,
	"tool_input" jsonb,
	"tool_output" jsonb,
	"tool_error" text,
	"file_id" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "text_content_required_if_type_is_text" CHECK (CASE WHEN "parts"."type" = 'text' THEN "parts"."text_content" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "reasoning_content_required_if_type_is_reasoning" CHECK (CASE WHEN "parts"."type" = 'reasoning' THEN "parts"."reasoning_content" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "source_fields_required_if_type_is_source" CHECK (CASE WHEN "parts"."type" = 'source' THEN "parts"."source_url" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "tool_fields_required_if_type_is_tool" CHECK (CASE WHEN "parts"."type" = 'tool-invocation' THEN "parts"."tool_callId" IS NOT NULL AND "parts"."tool_name" IS NOT NULL AND "parts"."tool_state" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "file_id_required_if_type_is_file" CHECK (CASE WHEN "parts"."type" = 'file' THEN "parts"."file_id" IS NOT NULL ELSE TRUE END)
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"storagePath" text NOT NULL,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" bigint NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chats_user_id_updated_at_idx" ON "chats" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "chats_parent_chat_id_idx" ON "chats" USING btree ("parentChatId");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "messages_chat_id_order_idx" ON "messages" USING btree ("chatId","order");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "parts_message_id_idx" ON "parts" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "parts_message_id_order_idx" ON "parts" USING btree ("messageId","order");--> statement-breakpoint
CREATE INDEX "parts_type_idx" ON "parts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "parts_tool_call_id_idx" ON "parts" USING btree ("tool_callId");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "files_storage_path_idx" ON "files" USING btree ("storagePath");