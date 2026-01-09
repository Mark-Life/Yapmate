import { auth } from "./routers/auth";
import { chat } from "./routers/chat";
import { chats } from "./routers/chats";
import { feedback } from "./routers/feedback";
import { messages } from "./routers/messages";
import { models } from "./routers/models";
import { settings } from "./routers/settings";
import { subscription } from "./routers/subscription";

export const router = {
  auth,
  chat,
  chats,
  feedback,
  messages,
  models,
  settings,
  subscription,
};

export type Router = typeof router;
