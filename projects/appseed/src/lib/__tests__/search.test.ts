import { highlight, matches, normalize, pushHistory } from "../search";

describe("search", () => {
  it("normalises case, accents and whitespace", () => {
    expect(normalize("  Expo   SUPABASE ")).toBe("expo supabase");
    expect(normalize("Café")).toBe("cafe");
  });

  it("requires every token to match", () => {
    expect(matches("expo supabase", ["Pocket Ledger", "Expo", "Supabase"])).toBe(true);
    expect(matches("expo stripe", ["Pocket Ledger", "Expo", "Supabase"])).toBe(false);
    expect(matches("記帳", ["Pocket Ledger 記帳本"])).toBe(true);
    expect(matches("", ["anything"])).toBe(true);
  });

  it("splits text into hit segments", () => {
    expect(highlight("Pocket Ledger", "ledg")).toEqual([
      { text: "Pocket ", hit: false },
      { text: "Ledg", hit: true },
      { text: "er", hit: false },
    ]);
    expect(highlight("abc", "")).toEqual([{ text: "abc", hit: false }]);
  });

  it("keeps history unique, newest first, capped", () => {
    expect(pushHistory(["expo", "ai"], "AI")).toEqual(["AI", "expo"]);
    expect(pushHistory(["a"], "  ")).toEqual(["a"]);
    expect(pushHistory(["1", "2", "3"], "4", 3)).toEqual(["4", "1", "2"]);
  });
});
