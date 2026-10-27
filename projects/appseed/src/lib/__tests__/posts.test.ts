import { POST_MAX, postScore, promoCountToday, remaining, segments, sortPosts, validatePost } from "../posts";

describe("posts", () => {
  it("validates length, links and the daily promotion limit", () => {
    const ok = { promo: false, promoToday: 0 };
    expect(validatePost("  ", ok)).toBe("empty");
    expect(validatePost("x".repeat(POST_MAX + 1), ok)).toBe("tooLong");
    expect(validatePost("a https://a.io b https://b.io c https://c.io", ok)).toBe("tooManyLinks");
    expect(validatePost("Launched today", { promo: true, promoToday: 3 })).toBe("promoLimit");
    expect(validatePost("Launched today", { promo: true, promoToday: 2 })).toBeNull();
    expect(validatePost("Just a reply", { promo: false, promoToday: 9 })).toBeNull();
  });

  it("shows the counter only near the limit", () => {
    expect(remaining("short")).toBeNull();
    expect(remaining("x".repeat(450))).toBe(50);
  });

  it("splits text into tags and links", () => {
    expect(segments("新作 #vibecoding 試玩 https://appseed.app/l/x 完")).toEqual([
      { text: "新作 ", kind: "text" },
      { text: "#vibecoding", kind: "tag" },
      { text: " 試玩 ", kind: "text" },
      { text: "https://appseed.app/l/x", kind: "link" },
      { text: " 完", kind: "text" },
    ]);
    expect(segments("#香港本地")).toEqual([{ text: "#香港本地", kind: "tag" }]);
  });

  it("ranks top posts by conversation and decays with age", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    const fresh = { id: "fresh", createdAt: "2026-10-27T11:00:00Z", likes: 3, replies: 1, reposts: 0 };
    const old = { id: "old", createdAt: "2026-10-25T12:00:00Z", likes: 40, replies: 2, reposts: 1 };
    const chatty = { id: "chatty", createdAt: "2026-10-27T10:00:00Z", likes: 2, replies: 6, reposts: 2 };
    expect(postScore(chatty, now)).toBeGreaterThan(postScore(fresh, now));
    expect(sortPosts([old, fresh, chatty], "top", now).map((p) => p.id)).toEqual(["chatty", "fresh", "old"]);
    expect(sortPosts([old, chatty, fresh], "latest", now).map((p) => p.id)).toEqual(["fresh", "chatty", "old"]);
  });

  it("counts only today's top-level posts with an attached app", () => {
    const now = new Date(2026, 9, 27, 15);
    const at = (h: number, d = 27) => new Date(2026, 9, d, h).toISOString();
    const posts = [
      { userId: "me", createdAt: at(9), attachment: {} },
      { userId: "me", createdAt: at(10), attachment: {}, parentId: "p1" },
      { userId: "me", createdAt: at(11) },
      { userId: "me", createdAt: at(22, 26), attachment: {} },
      { userId: "you", createdAt: at(12), attachment: {} },
    ];
    expect(promoCountToday(posts, "me", now)).toBe(1);
  });
});
