import { api as mockApi } from "@/api/mockServer";
import { templates } from "@/data/mock";
import { launches, prompts } from "@/data/marketplace";
import { en } from "@/i18n/en";
import { zhHant } from "@/i18n/zh-Hant";
import { buildLeaderboard } from "../ranking";
import { ALL_CATEGORIES, APPLE_CATEGORIES, appleCategoryOf, categoryCounts, categoryKeys, cleanCategories, inCategory, isCategory, VIBE_CATEGORIES, VIBE_PARENT, vibeChildren, topCharts } from "../categories";
import { CATEGORY_ICON } from "@/components/market/categoryIcons";

describe("categories (§40)", () => {
  it("is the App Store list plus vibe coding categories, each under one App Store parent", () => {
    expect(APPLE_CATEGORIES).toHaveLength(25);
    expect(APPLE_CATEGORIES).toEqual(expect.arrayContaining(["finance", "productivity", "games", "developerTools", "foodDrink", "lifestyle"]));
    expect(VIBE_PARENT.expense).toBe("finance");
    for (const v of VIBE_CATEGORIES) expect(APPLE_CATEGORIES).toContain(VIBE_PARENT[v]);
    expect(new Set(ALL_CATEGORIES).size).toBe(ALL_CATEGORIES.length);
    expect(vibeChildren("finance")).toEqual(["expense"]);
    expect(categoryKeys("finance")).toEqual(["finance", "expense"]);
    expect(categoryKeys("expense")).toEqual(["expense"]);
    expect(appleCategoryOf("casualGame")).toBe("games");
  });

  it("has a label in every language and an icon for every category", () => {
    for (const k of ALL_CATEGORIES) {
      expect(zhHant.category[k]).toBeTruthy();
      expect(en.category[k]).toBeTruthy();
      expect(CATEGORY_ICON[k]).toBeTruthy();
    }
    expect(zhHant.category.expense).toBe("記帳");
  });

  it("puts a listing on its own, its secondary and its App Store parent's boards", () => {
    const splitBill = { category: "expense", secondaryCategory: null };
    expect(inCategory(splitBill, "expense")).toBe(true);
    expect(inCategory(splitBill, "finance")).toBe(true);
    expect(inCategory(splitBill, "productivity")).toBe(false);
    const studyDuo = { category: "education", secondaryCategory: "habit" };
    expect(inCategory(studyDuo, "habit")).toBe(true);
    expect(inCategory(studyDuo, "productivity")).toBe(true);
    // A vibe board never pulls in its parent's other listings.
    expect(inCategory({ category: "finance" }, "expense")).toBe(false);
    expect(inCategory({ category: "tools" }, "utilities")).toBe(false);
    expect(categoryCounts([splitBill, studyDuo])).toMatchObject({ expense: 1, finance: 1, education: 1, habit: 1, productivity: 1 });
  });

  it("checks submitted categories the same way on the client and the server", () => {
    expect(cleanCategories("expense", null)).toEqual({ category: "expense" });
    expect(cleanCategories("expense", "")).toEqual({ category: "expense" });
    expect(cleanCategories("habit", "education")).toEqual({ category: "habit", secondaryCategory: "education" });
    expect(cleanCategories("tools", null)).toEqual({ error: "invalidCategory" });
    expect(cleanCategories(undefined, null)).toEqual({ error: "invalidCategory" });
    expect(cleanCategories("habit", "habit")).toEqual({ error: "invalidCategory" });
    expect(cleanCategories("habit", "crypto")).toEqual({ error: "invalidCategory" });
    expect(isCategory("__proto__")).toBe(false);
  });

  it("gives every demo listing a real category", () => {
    for (const x of [...templates, ...prompts, ...launches]) {
      expect(isCategory(x.category)).toBe(true);
      if (x.secondaryCategory) expect(isCategory(x.secondaryCategory)).toBe(true);
    }
  });

  it("builds top paid and top free charts by sales inside a category", () => {
    const items = [
      { slug: "a", category: "expense", price: 88, sales: 10 },
      { slug: "b", category: "finance", price: 0, sales: 50 },
      { slug: "c", category: "habit", secondaryCategory: "finance", price: 38, sales: 30 },
      { slug: "d", category: "casualGame", price: 18, sales: 99 },
    ];
    const { paid, free } = topCharts(items, "finance");
    expect(paid.map((x) => x.slug)).toEqual(["c", "a"]);
    expect(free.map((x) => x.slug)).toEqual(["b"]);
    expect(topCharts(items, "expense").paid.map((x) => x.slug)).toEqual(["a"]);
  });

  it("ranks each category's board on its own, with the same algorithm", async () => {
    const now = Date.now();
    const all = await mockApi.leaderboard("month");
    const games = await mockApi.leaderboard("month", "games");
    expect(games.board.length).toBeGreaterThan(0);
    expect(games.board.every((l) => inCategory(l, "games"))).toBe(true);
    // Ranks restart at 1 inside a category and follow the overall order.
    expect(games.board.map((l) => l.rank)).toEqual(games.board.map((_, i) => i + 1));
    const order = all.board.filter((l) => inCategory(l, "games")).map((l) => l.slug);
    expect(games.board.map((l) => l.slug)).toEqual(order);
    expect(buildLeaderboard([], "today", now).board).toEqual([]);
    const casual = await mockApi.leaderboard("month", "casualGame");
    expect(casual.board.map((l) => l.slug)).toEqual(order.filter((s) => launches.find((l) => l.slug === s)!.category === "casualGame" || launches.find((l) => l.slug === s)!.secondaryCategory === "casualGame"));
  });
});
