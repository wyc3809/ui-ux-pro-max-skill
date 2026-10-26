import { templates } from "@/data/mock";
import { searchTemplates } from "../mockServer";

describe("searchTemplates", () => {
  it("matches stack keywords", () => {
    const r = searchTemplates([...templates], { q: "expo supabase" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.stack.some((s) => /supabase/i.test(s)))).toBe(true);
  });
  it("filters by price and platform, sorts by sales", () => {
    const free = searchTemplates([...templates], { q: "", price: "free" });
    expect(free.every((t) => t.price === 0)).toBe(true);
    const web = searchTemplates([...templates], { q: "", platform: "Web", sort: "sales" });
    expect(web.every((t) => t.platforms.includes("Web"))).toBe(true);
    expect(web.map((t) => t.sales)).toEqual([...web.map((t) => t.sales)].sort((a, b) => b - a));
  });
  it("only uses fixed price tiers in fixtures", () => {
    expect(templates.every((t) => [0, 38, 78, 158, 388, 788].includes(t.price))).toBe(true);
  });
});
