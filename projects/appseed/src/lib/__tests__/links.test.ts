import { shareLink } from "../engagement";
import { appPath, ORIGIN, postLink, shortPath } from "../links";

describe("one link for every platform", () => {
  it("shares short links on the app's own domain that redirect to the full routes", () => {
    expect(shareLink("template", "pocket-ledger")).toBe(`${ORIGIN}/t/pocket-ledger`);
    expect(shortPath("launch", "ferry-now")).toBe("/l/ferry-now");
    expect(appPath("prompt", "landing-copy")).toBe("/prompt/landing-copy");
    expect(postLink("p1")).toBe("https://vcseed.app/post/p1");
  });

  it("lists every shared path in the universal link and App Link config", () => {
    const app = require("../../../app.json").expo;
    const aasa = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "../../../public/.well-known/apple-app-site-association"), "utf8"));
    const androidPaths = app.android.intentFilters[0].data.map((d: { pathPrefix: string }) => d.pathPrefix);
    const iosPaths = aasa.applinks.details[0].paths.map((p: string) => p.replace("/*", ""));
    for (const p of ["/t", "/p", "/l", "/template", "/prompt", "/launch", "/post", "/creator"]) {
      expect(androidPaths).toContain(p);
      expect(iosPaths).toContain(p);
    }
    expect(app.ios.associatedDomains).toEqual(["applinks:vcseed.app"]);
  });
});
