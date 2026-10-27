import { boardScore, engagement, rankBoard, sponsoredPick, weightedVotes, withMovement, type RankSignals } from "../ranking";

const now = Date.parse("2026-10-27T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const L = (slug: string, o: Partial<RankSignals> = {}) => ({ slug, upvotes: 100, trustedShare: 1, newAccountShare: 0, comments: 0, shares: 0, reports: 0, launchedAt: hoursAgo(5), boosted: false, ...o });

describe("leaderboard algorithm", () => {
  it("weights votes by account trust and halves suspected vote rings", () => {
    expect(weightedVotes({ upvotes: 100, trustedShare: 1, newAccountShare: 0 })).toBe(100);
    expect(weightedVotes({ upvotes: 100, trustedShare: 0, newAccountShare: 0 })).toBe(50);
    expect(weightedVotes({ upvotes: 100, trustedShare: 1, newAccountShare: 0.5 })).toBe(50);
  });

  it("counts comments and shares as engagement", () => {
    expect(engagement(L("a", { comments: 10, shares: 10 }))).toBe(108);
  });

  it("decays today hard, this week gently and this month not at all", () => {
    const fresh = L("fresh", { launchedAt: hoursAgo(2) });
    const old = L("old", { launchedAt: hoursAgo(20) });
    const todayRatio = boardScore(fresh, "today", now) / boardScore(old, "today", now);
    const weekRatio = boardScore(fresh, "week", now) / boardScore(old, "week", now);
    expect(todayRatio).toBeGreaterThan(weekRatio);
    expect(boardScore(fresh, "month", now)).toBe(boardScore(old, "month", now));
  });

  it("keeps each period to its window and drops sponsored and heavily reported launches", () => {
    const items = [L("today"), L("lastweek", { launchedAt: hoursAgo(24 * 5) }), L("ad", { boosted: true }), L("flagged", { reports: 3 })];
    expect(rankBoard(items, "today", now).map((x) => x.slug)).toEqual(["today"]);
    expect(rankBoard(items, "week", now).map((x) => x.slug)).toEqual(["today", "lastweek"]);
    expect(sponsoredPick(items, "today", now)?.slug).toBe("ad");
  });

  it("lets a strong new launch beat a bigger but older one today, while the month board favours totals", () => {
    const items = [L("new", { upvotes: 120, launchedAt: hoursAgo(3) }), L("big", { upvotes: 400, launchedAt: hoursAgo(22) })];
    expect(rankBoard(items, "today", now).map((x) => x.slug)).toEqual(["new", "big"]);
    expect(rankBoard(items, "month", now).map((x) => x.slug)).toEqual(["big", "new"]);
  });

  it("breaks ties by comments, then the earlier launch", () => {
    const items = [L("b", { launchedAt: hoursAgo(5) }), L("a", { launchedAt: hoursAgo(5), comments: 1, upvotes: 99.5 })];
    expect(rankBoard(items, "month", now).map((x) => x.slug)).toEqual(["a", "b"]);
  });

  it("reports movement against an earlier snapshot", () => {
    const moved = withMovement(
      [
        { slug: "a", rank: 1 },
        { slug: "b", rank: 2 },
        { slug: "c", rank: 3 },
        { slug: "d", rank: 4 },
      ],
      [
        { slug: "b", rank: 1 },
        { slug: "a", rank: 3 },
        { slug: "c", rank: 3 },
      ],
    );
    expect(moved.map((m) => m.movement)).toEqual([{ kind: "up", by: 2 }, { kind: "down", by: 1 }, { kind: "same" }, { kind: "new" }]);
  });
});
