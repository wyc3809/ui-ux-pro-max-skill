import { normalize, screenText, validateReport, withoutBlocked } from "../moderation";

describe("content screening", () => {
  it("passes ordinary posts, including Cantonese and words that merely contain a flagged string", () => {
    expect(screenText("Pocket Ledger 加入了月結圖表 #vibecoding")).toEqual({ ok: true });
    expect(screenText("Scunthorpe has a great app scene")).toEqual({ ok: true });
    expect(screenText("訂閱制定價應該點樣揀？")).toEqual({ ok: true });
    expect(screenText("版本 1.4.0 已上架，修正 3 個問題")).toEqual({ ok: true });
    expect(screenText("We just hit 1000000 downloads")).toEqual({ ok: true });
    expect(screenText("raised 60000000 HKD from 5000 8000 users")).toEqual({ ok: true });
    expect(screenText("Changelog\n------\nfixes")).toEqual({ ok: true });
    expect(screenText("our software 9123 4567 build")).toEqual({ ok: true });
  });

  it("catches abuse in English and Cantonese, including simple disguises", () => {
    expect(screenText("you f*ck1ng idiot")).toEqual({ ok: false, reason: "abuse" });
    expect(screenText("ＦＵＣＫ this")).toEqual({ ok: false, reason: "abuse" });
    expect(screenText("仆街，咁都唔識")).toEqual({ ok: false, reason: "abuse" });
    expect(normalize("Sh1t$")).toBe("shits");
  });

  it("blocks off-platform contact and payment details that invite scams", () => {
    expect(screenText("WhatsApp 9123 4567 傾價")).toEqual({ ok: false, reason: "contact" });
    expect(screenText("加我 telegram: @dealer")).toEqual({ ok: false, reason: "contact" });
    expect(screenText("直接 FPS 12345678 俾錢")).toEqual({ ok: false, reason: "contact" });
    expect(screenText("電話 6123-4567")).toEqual({ ok: false, reason: "contact" });
    expect(screenText("+852 9876 5432 搵我")).toEqual({ ok: false, reason: "contact" });
  });

  it("flags repeated characters and words as spam", () => {
    expect(screenText("buy buy buy buy now")).toEqual({ ok: false, reason: "spam" });
    expect(screenText("soooooo good")).toEqual({ ok: false, reason: "spam" });
    expect(screenText("好正！！！！！！")).toEqual({ ok: false, reason: "spam" });
  });
});

describe("reports and blocking", () => {
  it("requires details and contact for IP claims only", () => {
    expect(validateReport(null, "", "")).toBe("reason");
    expect(validateReport("spam", "", "")).toBeNull();
    expect(validateReport("ip", "short", "a@b.co")).toBe("detail");
    expect(validateReport("ip", "This listing copies my repository line for line", "nope")).toBe("contact");
    expect(validateReport("ip", "This listing copies my repository line for line", "owner@example.com")).toBeNull();
    expect(validateReport("other", "hi", "")).toBe("detail");
  });

  it("hides content from blocked people", () => {
    const items = [{ handle: "a" }, { handle: "b" }];
    expect(withoutBlocked(items, ["b"])).toEqual([{ handle: "a" }]);
    expect(withoutBlocked(items, [])).toBe(items);
  });
});
