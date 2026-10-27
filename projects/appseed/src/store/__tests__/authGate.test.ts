import { requireAuth, useAuthGate } from "../authGate";
import { useSession } from "../session";

const user = { id: "u1", name: "Jamie", handle: "jamie", email: "j@example.com", provider: "email" as const, createdAt: "2026-10-27" };

describe("auth gate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSession.setState({ user: null });
    useAuthGate.setState({ open: false, reason: null, pending: null });
  });
  afterEach(() => jest.useRealTimers());

  it("runs the action straight away when signed in", () => {
    useSession.setState({ user });
    const action = jest.fn();
    requireAuth("auth.reasonBuy", action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(useAuthGate.getState().open).toBe(false);
  });

  it("opens sign-in with a reason, then resumes the action after sign-in (§11.2)", () => {
    const action = jest.fn();
    requireAuth("auth.reasonFavorite", action);
    expect(useAuthGate.getState()).toMatchObject({ open: true, reason: "auth.reasonFavorite" });
    expect(action).not.toHaveBeenCalled();
    useSession.setState({ user });
    useAuthGate.getState().finish();
    expect(useAuthGate.getState().open).toBe(false);
    jest.runAllTimers();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("drops the pending action if the sheet is dismissed", () => {
    const action = jest.fn();
    requireAuth("auth.reasonBuy", action);
    useAuthGate.getState().close();
    useAuthGate.getState().finish();
    jest.runAllTimers();
    expect(action).not.toHaveBeenCalled();
  });
});
