/** Pure Guest Mode reply builder for AnonSay. No I/O, no cross-dir imports beyond
 * guest.ts (dependency-free), so this runs under plain `node --test`. */
import type { GuestReply } from "./guest.ts";

/**
 * Posting anonymously into a chat we are not in is not a thing we can do, so this is always
 * the localized pitch: the caller passes in the plain-text (Markdown stripped) /start copy.
 */
export function buildGuestReply(botUsername: string, startTextPlain: string): GuestReply {
  return {
    title: "🎭 AnonSay — post anonymously into your group",
    description: "Try: @" + botUsername + " to get started",
    text: startTextPlain,
  };
}
