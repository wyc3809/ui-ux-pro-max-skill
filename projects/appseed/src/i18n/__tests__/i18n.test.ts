import { en } from "../en";
import { translate } from "../index";
import { zhHant } from "../zh-Hant";

const leaves = (o: object, p = ""): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[`${p}${k}`, v] as [string, string]] : leaves(v as object, `${p}${k}.`)));

describe("i18n", () => {
  it("en and zh-Hant have identical keys", () => {
    expect(leaves(en).map(([k]) => k).sort()).toEqual(leaves(zhHant).map(([k]) => k).sort());
  });

  it("zh-Hant UI copy is written Chinese (書面語), not Cantonese (§15)", () => {
    const colloquial = /[嘅咗唔喺冇佢哋啲嚟睇嘢咁乜囉喇㗎嗰]/;
    const offenders = leaves(zhHant).filter(([, v]) => colloquial.test(v));
    expect(offenders).toEqual([]);
  });

  it("interpolates variables", () => {
    expect(translate(zhHant, "template.unlockAll", { n: 12 })).toBe("購買後解鎖全部 12 個步驟");
    expect(translate(en, "search.results", { n: 3 })).toBe("3 results");
  });

  it("uses no hard-sell wording", () => {
    const hype = /立即搶購|限時搶|Buy now!|Hurry/;
    expect([...leaves(zhHant), ...leaves(en)].filter(([, v]) => hype.test(v))).toEqual([]);
  });
});
