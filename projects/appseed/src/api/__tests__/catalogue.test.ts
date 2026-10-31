import { prompts, launches } from "@/data/marketplace";
import { templates } from "@/data/mock";
import { LOCKED, toLaunch, toPrompt, toTemplate } from "../catalogue";

describe("catalogue rows to app types", () => {
  it("turns cents back into dollars", () => {
    const t = templates.find((x) => x.price > 0)!;
    expect(toTemplate({ slug: t.slug, kind: "template", price: t.price * 100, data: t as never })).toEqual(t);
  });

  it("locks paid prompt lines unless the owner's full text is supplied", () => {
    const p = prompts.find((x) => x.price > 0 && x.text.split("\n").length > x.previewLines)!;
    const lines = p.text.split("\n");
    const row = { slug: p.slug, kind: "prompt", price: p.price * 100, data: { ...p, text: lines.slice(0, p.previewLines).join("\n"), lineCount: lines.length } as never };
    const locked = toPrompt(row);
    expect(locked.text.endsWith(LOCKED)).toBe(true);
    expect(locked.text).not.toContain(lines[lines.length - 1]);
    expect(locked.lineCount).toBe(lines.length);
    expect(toPrompt(row, p.text).text).toBe(p.text);
  });

  it("adds live votes to a launch and switches to the real trust split once votes exist", () => {
    const l = launches[0]!;
    const row = { slug: l.slug, kind: "launch", price: 0, data: l as never };
    expect(toLaunch(row, undefined, false)).toMatchObject({ upvotes: l.upvotes, trustedShare: l.trustedShare, voted: false });
    const live = toLaunch(row, { slug: l.slug, upvotes: 4, trusted_share: 0.25, new_account_share: 0.5, reports: 1, shares: 2, comments: 3 }, true);
    expect(live).toMatchObject({ upvotes: l.upvotes + 4, trustedShare: 0.25, newAccountShare: 0.5, reports: l.reports + 1, shares: l.shares + 2, comments: l.comments + 3, voted: true });
  });
});
