import { auth } from "./routers/auth";
import { chat } from "./routers/chat";
import { chats } from "./routers/chats";
import { messages } from "./routers/messages";
import { models } from "./routers/models";
import { subscription } from "./routers/subscription";

export const router = {
  auth,
  chat,
  chats,
  messages,
  models,
  subscription,
};

export type Router = typeof router;
