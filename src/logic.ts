/** Pure helpers for AnonSay: sanitizing posts, rate/daily limits, hashing, deep links. */

const MENTION_RE = /@[A-Za-z0-9_]{3,32}/g;
const LINK_RE = /\b((?:https?:\/\/|www\.)\S+|t\.me\/\S+)/gi;
export const MAX_CHARS = 500;

/** Strips @mentions, replaces links with "[link]", collapses whitespace, and caps length. */
export function sanitize(text: string): string {
  const noLinks = text.replace(LINK_RE, "[link]");
  const noMentions = noLinks.replace(MENTION_RE, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return noMentions.slice(0, MAX_CHARS);
}

export function exceedsRate(recentCount: number, limit: number): boolean {
  return recentCount >= limit;
}

/** Group-wide free daily cap; Pro groups are unlimited. */
export function dailyLimitReached(postsToday: number, pro: boolean, freeLimit: number): boolean {
  return !pro && postsToday >= freeLimit;
}

/** SHA-256(userId + salt) as hex, deterministic for a given (id, salt) pair. */
export async function hashSender(userId: number, salt: string): Promise<string> {
  const data = new TextEncoder().encode(String(userId) + ":" + salt);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Deep-link payload encoding for negative chat ids: "-100123" <-> "m100123". */
export function encodeChatId(chatId: number): string {
  return String(chatId).replace("-", "m");
}
export function decodeChatId(s: string): number | null {
  if (!/^m?\d+$/.test(s)) return null;
  return Number(s.replace("m", "-"));
}

/** True for a first-touch attribution payload on /start (e.g. "site", "share", "list", "x"),
 *  never the reserved "pro" tag or a "pro_<id>" per-group payload. */
export const SOURCE_PAYLOAD_RE = /^[a-z]{2,12}$/;
export function isSourcePayload(s: string): boolean { return s !== "pro" && SOURCE_PAYLOAD_RE.test(s); }
