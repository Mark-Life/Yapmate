CREATE TABLE "chat_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"displayName" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_members_chat_user_unique" UNIQUE("chatId","userId")
);
--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "isMultiUser" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_members_chat_id_idx" ON "chat_members" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "chat_members_user_id_idx" ON "chat_members" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill existing user messages with userId from chat owner
UPDATE messages
SET "userId" = (SELECT "userId" FROM chats WHERE chats.id = messages."chatId")
WHERE role = 'user';