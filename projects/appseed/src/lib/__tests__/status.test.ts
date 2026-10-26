import { light } from "@/theme/tokens";
import { statusTone, toneColors, type TemplateStatus } from "../status";

describe("statusTone", () => {
  it.each<[TemplateStatus, string]>([
    ["live", "live"],
    ["purchased", "live"],
    ["pending", "pending"],
    ["draft", "ended"],
    ["unlisted", "ended"],
    ["changes", "warn"],
    ["rejected", "danger"],
  ])("%s → %s", (s, tone) => expect(statusTone(s)).toBe(tone));

  it("never uses the brand colour for status", () => {
    for (const tone of ["live", "pending", "ended", "warn", "danger"] as const) {
      expect(toneColors(tone, light).fg).not.toBe(light.accent);
    }
  });
});
