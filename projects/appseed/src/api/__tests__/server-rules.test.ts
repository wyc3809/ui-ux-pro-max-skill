import { TERMS_VERSION } from "@/lib/contact";
import { mmkv } from "@/store/storage";
import { api } from "../mockServer";

jest.setTimeout(20_000);

const ticket = async (sub: string) => {
  const r = await api.signInWithApple({ sub, email: `${sub}@example.com`, name: null });
  if (r.status !== "needsProfile") throw new Error("expected a new account");
  return r.ticket;
};

beforeEach(() => mmkv.clearAll());

describe("server rules the client cannot bypass", () => {
  it("refuses accounts without the current terms, and bad or taken handles", async () => {
    await expect(api.completeProfile({ ticket: await ticket("a1"), name: "A", handle: "jamie-a", termsVersion: 0 })).rejects.toThrow("termsRequired");
    await expect(api.completeProfile({ ticket: await ticket("a2"), name: "A", handle: "admin", termsVersion: TERMS_VERSION })).rejects.toThrow("handleReserved");
    await expect(api.completeProfile({ ticket: await ticket("a3"), name: "A", handle: "kaylee-builds", termsVersion: TERMS_VERSION })).rejects.toThrow("handleTaken");
    const user = await api.completeProfile({ ticket: await ticket("a4"), name: "A", handle: "jamie-a", termsVersion: TERMS_VERSION });
    expect(user.termsVersion).toBe(TERMS_VERSION);
    expect(user).not.toHaveProperty("appleSub");
    await expect(api.completeProfile({ ticket: await ticket("a5"), name: "B", handle: "jamie-a", termsVersion: TERMS_VERSION })).rejects.toThrow("handleTaken");
  });

  it("never returns provider subject ids when an existing account signs in", async () => {
    await api.completeProfile({ ticket: await ticket("b1"), name: "B", handle: "jamie-b", termsVersion: TERMS_VERSION });
    const again = await api.signInWithApple({ sub: "b1", email: null, name: null });
    expect(again.status).toBe("signedIn");
    expect(again.status === "signedIn" && again.user).not.toHaveProperty("appleSub");
  });

  it("asks for the terms again when an account accepted an older version", async () => {
    const user = await api.completeProfile({ ticket: await ticket("c1"), name: "C", handle: "jamie-c", termsVersion: TERMS_VERSION });
    const stored = JSON.parse(mmkv.getString("mock-server:users")!) as { id: string; termsVersion: number }[];
    mmkv.set("mock-server:users", JSON.stringify(stored.map((u) => (u.id === user.id ? { ...u, termsVersion: TERMS_VERSION - 1 } : u))));
    const who = { id: user.id, name: user.name, handle: user.handle };
    await expect(api.createPost({ body: "Hello", user: who })).rejects.toThrow("termsRequired");
    await api.acceptTerms(user.id);
    await expect(api.createPost({ body: "Hello", user: who })).resolves.toMatchObject({ body: "Hello" });
  });

  it("screens buyout offer messages for off-platform contact", async () => {
    await expect(api.makeOffer({ slug: "pomodoro-garden", amount: 120000, message: "skip escrow, WhatsApp 9123 4567" })).rejects.toThrow("contact");
    await expect(api.makeOffer({ slug: "pomodoro-garden", amount: 120000, message: "Keen to keep it running" })).resolves.toMatchObject({ status: "sent" });
  });

  it("keeps heavily reported launches out of the general list", async () => {
    const list = await api.launches();
    expect(list.some((l) => l.slug === "quiz-rush")).toBe(false);
  });
});
