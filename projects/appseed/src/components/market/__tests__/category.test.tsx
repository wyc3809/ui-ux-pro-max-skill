import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { router } from "expo-router";
import { useSettings } from "@/store/settings";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { CategoryLinks, CategoryPicker, CategoryRow } from "../Category";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// The bottom sheet needs the native gesture runtime; an inline stand-in keeps the picker's own logic under test.
jest.mock("@/components/ui/Sheet", () => ({ Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? children : null) }));

const wrap = (ui: ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);
beforeEach(() => {
  useSettings.setState({ locale: "zh-Hant" });
  (router.push as jest.Mock).mockClear();
});

describe("categories on screen (§40)", () => {
  it("opens a category's page from its row and from a listing's category links", async () => {
    await wrap(<CategoryRow k="expense" value="3 個作品" />);
    await fireEvent.press(screen.getByLabelText("記帳, 3 個作品"));
    expect(router.push).toHaveBeenCalledWith("/category/expense");
    await wrap(<CategoryLinks item={{ category: "hkLife", secondaryCategory: "navigation" }} />);
    await fireEvent.press(screen.getByLabelText("導航"));
    expect(router.push).toHaveBeenLastCalledWith("/category/navigation");
    // Unknown (pre-category) values show nothing rather than a broken link.
    await wrap(<CategoryLinks item={{ category: "tools" }} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows the chosen primary and an optional secondary category", async () => {
    const onChange = jest.fn();
    await wrap(<CategoryPicker value="expense" secondary={null} onChange={onChange} />);
    expect(screen.getByLabelText("主要類別: 記帳")).toBeTruthy();
    expect(screen.getByLabelText("次要類別（選填）: 不設定")).toBeTruthy();
    // The secondary list leaves out the primary, then a pick reports both.
    await fireEvent.press(screen.getByLabelText("次要類別（選填）: 不設定"));
    expect(screen.queryByRole("radio", { name: "記帳" })).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "財經" }));
    expect(onChange).toHaveBeenCalledWith("expense", "finance");
  });
});
