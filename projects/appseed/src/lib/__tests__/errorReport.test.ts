import { errorReport, reportError, scrub, setErrorSink } from "../errorReport";

describe("error reports", () => {
  it("keeps what broke and where, never who", () => {
    expect(scrub("failed for jamie@example.com with token eyJabc.def.ghi on +852 9123 4567")).toBe("failed for <email> with token <token> on <number>");
    const r = errorReport(new TypeError("x is undefined"), "/template/demo?checkout=success", "ios", "0.1.0");
    expect(r).toMatchObject({ platform: "ios", app_version: "0.1.0", route: "/template/demo", message: "TypeError: x is undefined" });
    expect(errorReport("boom", "", "windows").platform).toBe("web");
    expect(errorReport(new Error("word ".repeat(200)), "").message.length).toBe(500);
  });

  it("sends at most 20 reports a session", () => {
    const sent: unknown[] = [];
    setErrorSink(async (r) => sent.push(r));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    for (let i = 0; i < 30; i++) reportError(new Error(`e${i}`));
    expect(sent).toHaveLength(20);
    spy.mockRestore();
    setErrorSink(null);
  });
});
