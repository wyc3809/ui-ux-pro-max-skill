/**
 * Staff tools (docs/DESIGN.md §36): the report queue (handled within 24 hours, App Review 1.2), listing review
 * and suspensions. Only people in `staff` get past the first line; every change is logged by the database.
 */
export interface AdminDeps {
  isStaff(userId: string): Promise<boolean>;
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
  /** Stops the account from signing in (Supabase Auth ban). */
  ban(userId: string): Promise<void>;
}

export class AdminError extends Error {}
const fail = (code: string): never => {
  throw new AdminError(code);
};
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function handleAdmin(deps: AdminDeps, userId: string, body: Record<string, unknown>): Promise<unknown> {
  if (!(await deps.isStaff(userId))) fail("notStaff");
  switch (body.action) {
    case "reports":
      return deps.rpc("admin_report_queue", {});
    case "listings":
      return deps.rpc("admin_listing_queue", {});
    case "resolve": {
      const action = str(body.decision, 20);
      if (!["dismiss", "hide", "restore"].includes(action)) fail("invalidAction");
      await deps.rpc("admin_resolve_report", { p_staff: userId, p_report: str(body.reportId, 64), p_action: action, p_note: str(body.note) });
      return { ok: true };
    }
    case "review":
      await deps.rpc("admin_review_listing", { p_staff: userId, p_slug: str(body.slug, 80), p_approve: body.approve === true, p_note: str(body.note) });
      return { ok: true };
    case "suspend": {
      const target = await deps.rpc<string>("admin_suspend", { p_staff: userId, p_handle: str(body.handle, 40), p_note: str(body.note) });
      await deps.ban(target);
      return { ok: true };
    }
    default:
      return fail("unknownAction");
  }
}
