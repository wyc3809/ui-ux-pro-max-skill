import { act, renderHook } from "@testing-library/react-native";
import { useFormDraft } from "../formDrafts";

describe("useFormDraft", () => {
  it("keeps both of two back-to-back patches from the same render", async () => {
    const { result } = await renderHook(() => useFormDraft("t", { a: 0, b: 0 }));
    const [, patch] = result.current;
    await act(async () => {
      patch({ a: 1 });
      patch({ b: 2 }); // same stale closure, like onChange then onStack after a scan
    });
    expect(result.current[0]).toEqual({ a: 1, b: 2 });
    await act(async () => result.current[2]());
    expect(result.current[0]).toEqual({ a: 0, b: 0 });
  });
});
