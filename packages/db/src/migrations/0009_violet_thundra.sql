CREATE TABLE "chat_mcp_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL,
	"toolName" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"transportType" text NOT NULL,
	"authType" text NOT NULL,
	"authHeaderName" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mcpServerId" uuid NOT NULL,
	"toolName" text NOT NULL,
	"displayName" text NOT NULL,
	"description" text,
	"inputSchema" jsonb NOT NULL,
	"lastSyncedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_mcp_tools" ADD CONSTRAINT "chat_mcp_tools_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_mcp_tools" ADD CONSTRAINT "chat_mcp_tools_mcpServerId_mcp_servers_id_fk" FOREIGN KEY ("mcpServerId") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tools" ADD CONSTRAINT "mcp_tools_mcpServerId_mcp_servers_id_fk" FOREIGN KEY ("mcpServerId") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_mcp_tools_unique_idx" ON "chat_mcp_tools" USING btree ("chatId","mcpServerId","toolName");--> statement-breakpoint
CREATE INDEX "chat_mcp_tools_chat_id_idx" ON "chat_mcp_tools" USING btree ("chatId");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_servers_user_name_idx" ON "mcp_servers" USING btree ("userId","name");--> statement-breakpoint
CREATE INDEX "mcp_servers_user_id_idx" ON "mcp_servers" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_tools_server_tool_idx" ON "mcp_tools" USING btree ("mcpServerId","toolName");--> statement-breakpoint
CREATE INDEX "mcp_tools_server_id_idx" ON "mcp_tools" USING btree ("mcpServerId");