CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"chatId" uuid,
	"messageId" uuid,
	"type" text NOT NULL,
	"provider" text,
	"model" text,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"cachedTokens" integer DEFAULT 0,
	"reasoningTokens" integer DEFAULT 0,
	"costUsd" numeric(12, 8),
	"generationId" text,
	"finishReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_records_user_id_idx" ON "usage_records" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "usage_records_user_id_created_at_idx" ON "usage_records" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "usage_records_chat_id_idx" ON "usage_records" USING btree ("chatId");