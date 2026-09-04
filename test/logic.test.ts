import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyLimitReached, decodeChatId, encodeChatId, exceedsRate, hashSender, isSourcePayload, sanitize,
} from "../src/logic.ts";

test("sanitize strips @mentions and replaces links with [link]", () => {
  assert.equal(sanitize("hey @bob check https://evil.com/spam now"), "hey check [link] now");
  assert.equal(sanitize("dm @alice_99 or www.spam.io"), "dm or [link]");
  assert.equal(sanitize("plain text, nothing to strip"), "plain text, nothing to strip");
});

test("sanitize caps length at MAX_CHARS", () => {
  const long = "a".repeat(900);
  assert.equal(sanitize(long).length, 500);
});

test("rate-limit: exceeded at or over the limit, not below it", () => {
  assert.equal(exceedsRate(1, 2), false);
  assert.equal(exceedsRate(2, 2), true);
  assert.equal(exceedsRate(9, 10), false);
});

test("daily free-limit: reached only for non-pro groups at or over the cap", () => {
  assert.equal(dailyLimitReached(19, false, 20), false);
  assert.equal(dailyLimitReached(20, false, 20), true);
  assert.equal(dailyLimitReached(500, true, 20), false); // pro is unlimited
});

test("hash determinism: same (id, salt) always hashes the same; different salt differs", async () => {
  const h1 = await hashSender(42, "salt-a");
  const h2 = await hashSender(42, "salt-a");
  const h3 = await hashSender(42, "salt-b");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.equal(h1.length, 64); // hex-encoded SHA-256
});

test("deep-link encode/decode round-trips negative chat ids", () => {
  const chatId = -1001234567890;
  const encoded = encodeChatId(chatId);
  assert.equal(encoded, "m1001234567890");
  assert.equal(decodeChatId(encoded), chatId);
  assert.equal(decodeChatId("123"), 123);
  assert.equal(decodeChatId("not-a-number"), null);
});

test("decodeChatId rejects everything encodeChatId would never produce", () => {
  // encodeChatId only ever emits "m<digits>" (negative chat ids) or "<digits>" — never a bare "-" form.
  assert.equal(decodeChatId("-123"), null);
  assert.equal(decodeChatId("m-123"), null);
  assert.equal(decodeChatId("m12x3"), null);
  assert.equal(decodeChatId(""), null);
  for (const id of [-1001234567890, -1, 42, 0]) assert.equal(decodeChatId(encodeChatId(id)), id);
});

test("source-payload regex", () => {
  assert.equal(isSourcePayload("site"), true);
  assert.equal(isSourcePayload("share"), true);
  assert.equal(isSourcePayload("list"), true);
  assert.equal(isSourcePayload("x"), false); // too short (min 2)
  assert.equal(isSourcePayload("pro"), false); // reserved
  assert.equal(isSourcePayload("pro_m1001234567890"), false); // per-group pro payload
  assert.equal(isSourcePayload("thisistoolongasrc"), false); // over 12 chars
  assert.equal(isSourcePayload("Site1"), false); // must be lowercase letters only
});
