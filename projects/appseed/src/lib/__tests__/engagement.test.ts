import { buildShareUrl, formatCompact, formatRelative, itemKey, shareLink, shouldCountView, validateComment, VIEW_DEDUPE_MS } from "../engagement";

describe("engagement", () => {
  it("keys items like favourites do", () => {
    expect(itemKey("template", "pocket-ledger")).toBe("pocket-ledger");
    expect(itemKey("prompt", "x")).toBe("prompt:x");
    expect(shareLink("launch", "moodboard-ai")).toBe("https://appseed.app/l/moodboard-ai");
  });
  it("builds encoded share intents", () => {
    const url = "https://appseed.app/t/pocket-ledger";
    expect(buildShareUrl("x", url, "記帳 & 動畫")).toBe("https://x.com/intent/post?text=%E8%A8%98%E5%B8%B3%20%26%20%E5%8B%95%E7%95%AB&url=https%3A%2F%2Fappseed.app%2Ft%2Fpocket-ledger");
    expect(buildShareUrl("linkedin", url, "x")).toBe("https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fappseed.app%2Ft%2Fpocket-ledger");
    expect(buildShareUrl("whatsapp", url, "Hi")).toBe("https://wa.me/?text=Hi%20https%3A%2F%2Fappseed.app%2Ft%2Fpocket-ledger");
    expect(buildShareUrl("threads", url, "Hi")).toContain("threads.net/intent/post?text=Hi%20https");
  });
  it("formats compact counts per locale", () => {
    expect(formatCompact(196, "en")).toBe("196");
    expect(formatCompact(21_500, "en")).toBe("21.5K");
    expect(formatCompact(1_250_000, "en")).toBe("1.3M");
    expect(formatCompact(9_999, "zh-Hant")).toBe("9,999");
    expect(formatCompact(21_500, "zh-Hant")).toBe("2.2萬");
  });
  it("dedupes views within 30 minutes", () => {
    expect(shouldCountView(undefined, 1000)).toBe(true);
    expect(shouldCountView(0, VIEW_DEDUPE_MS - 1)).toBe(false);
    expect(shouldCountView(0, VIEW_DEDUPE_MS)).toBe(true);
  });
  it("validates comments", () => {
    expect(validateComment("  ")).toBe("commentEmpty");
    expect(validateComment("a".repeat(501))).toBe("commentLong");
    expect(validateComment(" 好用！ ")).toBeNull();
  });
  it("formats relative times", () => {
    const now = new Date("2026-10-27T12:00:00Z").getTime();
    expect(formatRelative("2026-10-27T11:59:30Z", now, "zh-Hant")).toBe("剛剛");
    expect(formatRelative("2026-10-27T11:57:00Z", now, "zh-Hant")).toBe("3 分鐘前");
    expect(formatRelative("2026-10-27T07:00:00Z", now, "en")).toBe("5h ago");
    expect(formatRelative("2026-10-25T12:00:00Z", now, "zh-Hant")).toBe("2 日前");
    expect(formatRelative("2026-10-01T12:00:00Z", now, "zh-Hant")).toBe("2026年10月1日");
  });
});
