import { Redirect } from "expo-router";

/**
 * Guest index redirects immediately to chat
 */
export default function GuestIndex() {
  return <Redirect href="/(guest)/chat" />;
}
