import { auth } from "./routers/auth";
import { chat } from "./routers/chat";
import { chats } from "./routers/chats";
import { messages } from "./routers/messages";
import { models } from "./routers/models";

export const router = {
  auth,
  chat,
  chats,
  messages,
  models,
};

export type Router = typeof router;
