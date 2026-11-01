import { extensionFor, validateMedia } from "../media";
import { normalizeStoreLinks, storeIdFrom, storeUrl } from "../storeLinks";

describe("listing media rules", () => {
  it("accepts a square icon of at least 512 px and rejects the rest", () => {
    expect(validateMedia("icon", { mime: "image/png", bytes: 300_000, width: 1024, height: 1024 })).toBeNull();
    expect(validateMedia("icon", { mime: "image/png", bytes: 300_000, width: 1024, height: 900 })).toBe("iconNotSquare");
    expect(validateMedia("icon", { mime: "image/png", bytes: 300_000, width: 256, height: 256 })).toBe("iconTooSmall");
    expect(validateMedia("icon", { mime: "image/gif", bytes: 10, width: 1024, height: 1024 })).toBe("mediaType");
    expect(validateMedia("icon", { mime: "image/png", bytes: 3 * 1024 * 1024, width: 1024, height: 1024 })).toBe("mediaTooLarge");
  });

  it("checks screenshots and videos", () => {
    expect(validateMedia("screenshot", { mime: "image/webp", bytes: 900_000, width: 1179, height: 2556 })).toBeNull();
    expect(validateMedia("screenshot", { mime: "image/jpeg", bytes: 900_000, width: 200, height: 400 })).toBe("imageTooSmall");
    expect(validateMedia("video", { mime: "video/mp4", bytes: 20_000_000, durationMs: 28_000 })).toBeNull();
    expect(validateMedia("video", { mime: "video/mp4", bytes: 20_000_000, durationMs: 45_000 })).toBe("videoTooLong");
    expect(validateMedia("video", { mime: "video/webm", bytes: 1, durationMs: 1 })).toBe("mediaType");
    expect(extensionFor("video/quicktime")).toBe("mov");
  });
});

describe("store links", () => {
  it("keeps only the app id and rebuilds the canonical store URL", () => {
    expect(storeIdFrom("appStore", "https://apps.apple.com/hk/app/ferry-now/id1234567890?l=en")).toEqual({ id: "1234567890" });
    expect(storeIdFrom("googlePlay", "https://play.google.com/store/apps/details?id=app.ferrynow.hk&hl=zh_HK")).toEqual({ id: "app.ferrynow.hk" });
    expect(storeIdFrom("googlePlay", "app.ferrynow.hk")).toEqual({ id: "app.ferrynow.hk" });
    expect(storeUrl("appStore", "1234567890")).toBe("https://apps.apple.com/app/id1234567890");
  });

  it("refuses look-alike sites and the wrong store", () => {
    expect(storeIdFrom("appStore", "https://apps.apple.com.evil.example/app/id1234567890")).toEqual({ error: "storeLinkInvalid" });
    expect(storeIdFrom("appStore", "http://apps.apple.com/app/id1234567890")).toEqual({ error: "storeLinkInvalid" });
    expect(storeIdFrom("appStore", "https://play.google.com/store/apps/details?id=a.b")).toEqual({ error: "storeLinkWrongStore" });
    expect(storeIdFrom("googlePlay", "https://play.google.com/store/apps/details?id=javascript:alert")).toEqual({ error: "storeLinkInvalid" });
    expect(normalizeStoreLinks({ appStore: "", googlePlay: "app.ferrynow.hk" })).toEqual({ links: { googlePlay: "https://play.google.com/store/apps/details?id=app.ferrynow.hk" } });
    expect(normalizeStoreLinks({ appStore: "nope" })).toEqual({ error: "storeLinkInvalid", store: "appStore" });
  });
});

describe("listing preview pages", () => {
  const { pagesFor } = require("@/components/template/MediaCarousel") as typeof import("@/components/template/MediaCarousel");
  const cover = { from: "#000", to: "#111", icon: "code" as const };
  it("shows the video first, then screenshots, and placeholders only without uploads", () => {
    expect(pagesFor({ cover, screens: 3, media: { video: "v.mp4", screenshots: ["a.png", "b.png"] } }).map((p) => p.kind)).toEqual(["video", "shot", "shot"]);
    expect(pagesFor({ cover, screens: 3 }).map((p) => p.kind)).toEqual(["placeholder", "placeholder", "placeholder"]);
    expect(pagesFor({ cover, screens: 0, media: { screenshots: [] } })).toHaveLength(1);
  });
});
