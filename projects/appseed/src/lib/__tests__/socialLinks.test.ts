import { linkList, normalizeSocial, socialLabel, socialUrl } from "../socialLinks";

describe("social links", () => {
  it("accepts handles with or without @ and profile URLs", () => {
    expect(normalizeSocial("x", "@kaylee_builds")).toEqual({ value: "kaylee_builds" });
    expect(normalizeSocial("x", "https://twitter.com/kaylee_builds?s=20")).toEqual({ value: "kaylee_builds" });
    expect(normalizeSocial("instagram", "instagram.com/kaylee.builds/")).toEqual({ value: "kaylee.builds" });
    expect(normalizeSocial("github", "https://github.com/kaylee-ho")).toEqual({ value: "kaylee-ho" });
    expect(normalizeSocial("linkedin", "https://www.linkedin.com/in/kaylee-ho-hk")).toEqual({ value: "kaylee-ho-hk" });
    expect(normalizeSocial("threads", "https://www.threads.net/@kaylee.builds")).toEqual({ value: "kaylee.builds" });
  });

  it("rejects links to another site and malformed handles", () => {
    expect(normalizeSocial("github", "https://evil.example/kaylee")).toEqual({ error: "wrongSite" });
    expect(normalizeSocial("x", "this handle is far too long")).toEqual({ error: "invalidHandle" });
    expect(normalizeSocial("github", "-bad-")).toEqual({ error: "invalidHandle" });
    expect(normalizeSocial("x", "  ")).toEqual({ value: "" });
  });

  it("requires https for websites", () => {
    expect(normalizeSocial("website", "https://kaylee.dev/")).toEqual({ value: "https://kaylee.dev" });
    expect(normalizeSocial("website", "http://kaylee.dev")).toEqual({ error: "needsHttps" });
    expect(normalizeSocial("website", "javascript:alert(1)")).toEqual({ error: "needsHttps" });
  });

  it("builds URLs and labels only from stored values", () => {
    expect(socialUrl("threads", "kaylee.builds")).toBe("https://www.threads.net/@kaylee.builds");
    expect(socialUrl("linkedin", "kaylee-ho-hk")).toBe("https://www.linkedin.com/in/kaylee-ho-hk");
    expect(socialLabel("x", "kaylee_builds")).toBe("@kaylee_builds");
    expect(socialLabel("website", "https://www.kaylee.dev")).toBe("kaylee.dev");
    expect(linkList({ website: "https://kaylee.dev", x: "k" }).map((l) => l.kind)).toEqual(["x", "website"]);
  });
});
