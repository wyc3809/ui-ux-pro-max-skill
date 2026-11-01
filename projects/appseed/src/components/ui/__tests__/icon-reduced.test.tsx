import { render } from "@testing-library/react-native";
import { withTiming } from "react-native-reanimated";
import { Icon } from "../Icon";

// Reduce Motion on: a timing ends at once and calls its callback, the way a looping glyph restarts itself.
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: () => true,
    withTiming: jest.fn((to: number, _cfg?: unknown, done?: (finished: boolean) => void) => {
      done?.(true);
      return to;
    }),
  };
});

describe("Icon under Reduce Motion", () => {
  // A loop restarting from its own completion callback would recurse forever (it blanked the web app).
  it("keeps looping glyphs still", async () => {
    await render(<Icon name="rocket" color="#000" loop="breathe" enter={false} />);
    await render(<Icon name="refresh" color="#000" loop="spin" enter={false} />);
    expect((withTiming as jest.Mock).mock.calls.length).toBeLessThan(10);
  });
});
