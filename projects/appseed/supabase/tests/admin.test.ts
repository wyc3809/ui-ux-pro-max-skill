/** @jest-environment node */
import { type AdminDeps, handleAdmin } from "../functions/_shared/admin.ts";

const deps = (staff = true) => {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const banned: string[] = [];
  const d: AdminDeps = { isStaff: async () => staff, rpc: async (fn, args) => (calls.push({ fn, args }), (fn === "admin_suspend" ? "user-9" : []) as never), ban: async (u) => void banned.push(u) };
  return { d, calls, banned };
};

describe("admin function", () => {
  it("is for staff only", async () => {
    await expect(handleAdmin(deps(false).d, "u1", { action: "reports" })).rejects.toThrow("notStaff");
  });

  it("resolves reports with a known decision and records who did it", async () => {
    const f = deps();
    await handleAdmin(f.d, "staff-1", { action: "resolve", reportId: "r1", decision: "hide", note: "abuse" });
    expect(f.calls[0]).toEqual({ fn: "admin_resolve_report", args: { p_staff: "staff-1", p_report: "r1", p_action: "hide", p_note: "abuse" } });
    await expect(handleAdmin(f.d, "staff-1", { action: "resolve", reportId: "r1", decision: "delete-everything" })).rejects.toThrow("invalidAction");
  });

  it("reviews listings and suspends by hiding content and banning the sign-in", async () => {
    const f = deps();
    await handleAdmin(f.d, "staff-1", { action: "review", slug: "demo-tpl", approve: true });
    expect(f.calls[0]!.args).toMatchObject({ p_slug: "demo-tpl", p_approve: true });
    await handleAdmin(f.d, "staff-1", { action: "suspend", handle: "troll" });
    expect(f.banned).toEqual(["user-9"]);
  });
});
