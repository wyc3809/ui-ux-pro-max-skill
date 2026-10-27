import { affinity, ANON, diversify, forYou, forYouScore, tagsOf, type FeedPost, type Viewer } from "../feed";

const now = Date.parse("2026-10-27T12:00:00Z");
const P = (id: string, o: Partial<FeedPost> = {}): FeedPost => ({ id, userId: `u-${id}`, handle: `h-${id}`, body: "", createdAt: new Date(now - 5 * 3_600_000).toISOString(), likes: 10, replies: 0, reposts: 0, ...o });
const viewer: Viewer = { userId: "me", authors: ["kaylee-builds"], interests: ["vibecoding", "記帳"], kinds: ["template"], seen: [] };

describe("for you feed", () => {
  it("reads #tags case-insensitively", () => {
    expect(tagsOf("新作 #VibeCoding #記帳App")).toEqual(["vibecoding", "記帳app"]);
  });

  it("adds affinity for known authors, matching tags and liked listing kinds", () => {
    const p = P("a", { handle: "kaylee-builds", body: "#vibecoding #記帳 #新作", attachment: { kind: "template" } });
    expect(affinity(p, viewer)).toBeCloseTo(0.6 + 0.5 + 0.2);
    expect(affinity(p, ANON)).toBe(0);
  });

  it("boosts fresh posts and demotes seen and reported ones", () => {
    const base = P("a");
    expect(forYouScore(P("a", { createdAt: new Date(now - 20 * 60_000).toISOString() }), ANON, now)).toBeGreaterThan(forYouScore(P("a", { createdAt: new Date(now - 70 * 60_000).toISOString() }), ANON, now));
    expect(forYouScore(base, { ...ANON, seen: ["a"] }, now)).toBeCloseTo(forYouScore(base, ANON, now) * 0.6);
    expect(forYouScore({ ...base, reports: 3 }, ANON, now)).toBeCloseTo(forYouScore(base, ANON, now) * 0.3);
  });

  it("ranks a post from a followed interest above an equally popular stranger", () => {
    const stranger = P("s");
    const known = P("k", { handle: "kaylee-builds" });
    expect(forYou([stranger, known], viewer, now).map((p) => p.id)).toEqual(["k", "s"]);
  });

  it("keeps authors apart and promotion to one in three", () => {
    const list = [P("1", { handle: "x", promo: true }), P("2", { handle: "x", promo: true }), P("3", { handle: "y", promo: true }), P("4", { handle: "z" }), P("5", { handle: "w" })];
    const out = diversify(list).map((p) => p.id);
    expect(out).toEqual(["1", "4", "5", "2", "3"]);
  });

  it("pins the viewer's own post from the last 10 minutes", () => {
    const mine = P("m", { userId: "me", likes: 0, createdAt: new Date(now - 2 * 60_000).toISOString() });
    const hot = P("h", { likes: 500 });
    expect(forYou([hot, mine], viewer, now)[0]!.id).toBe("m");
    expect(forYou([hot, mine], ANON, now)[0]!.id).toBe("h");
  });
});
