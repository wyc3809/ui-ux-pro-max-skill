import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSettings } from "@/store/settings";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { Cover } from "../Cover";
import { StoreBadges } from "../StoreBadges";

const wrap = (ui: ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);
beforeEach(() => useSettings.setState({ locale: "zh-Hant" }));

describe("listing media on screen", () => {
  it("shows store buttons only for the stores a listing has", async () => {
    await wrap(<StoreBadges links={{ appStore: "https://apps.apple.com/app/id1234567890" }} />);
    expect(screen.getByLabelText("在 App Store 下載")).toBeTruthy();
    expect(screen.queryByLabelText("在 Google Play 下載")).toBeNull();
    await wrap(<StoreBadges links={{}} />);
    expect(screen.queryByLabelText("在 App Store 下載")).toBeNull();
  });

  it("uses the creator's uploaded icon instead of the generated cover", async () => {
    const cover = { from: "#5b3fd6", to: "#8b5cf6", icon: "wallet" as const };
    const { toJSON } = await wrap(<Cover t={{ cover, media: { icon: "https://demo.supabase.co/storage/v1/object/public/media/u1/icon.png", screenshots: [] } }} style={{ aspectRatio: 1 }} />);
    expect(JSON.stringify(toJSON())).toContain("u1/icon.png");
  });
});
