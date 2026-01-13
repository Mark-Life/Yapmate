import { auth } from "./routers/auth";
import { chat } from "./routers/chat";
import { chats } from "./routers/chats";
import { feedback } from "./routers/feedback";
import { invite } from "./routers/invite";
import { mcp } from "./routers/mcp";
import { members } from "./routers/members";
import { messages } from "./routers/messages";
import { models } from "./routers/models";
import { settings } from "./routers/settings";
import { subscription } from "./routers/subscription";
import { userRules } from "./routers/user-rules";

export const router = {
  auth,
  chat,
  chats,
  feedback,
  invite,
  mcp,
  members,
  messages,
  models,
  settings,
  subscription,
  userRules,
};

export type Router = typeof router;
