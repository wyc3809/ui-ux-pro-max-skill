import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSettings } from "@/store/settings";
import { INTRO_MS, LaunchMark } from "@/components/shell/LaunchMark";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { PriceTag } from "../PriceTag";
import { RatingStars } from "../RatingStars";
import { StatusBadge } from "../StatusBadge";

// RNTL 14: render is async.
const wrap = (ui: ReactNode) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => useSettings.setState({ locale: "zh-Hant" }));

describe("StatusBadge", () => {
  it("reads the status as text", async () => {
    await wrap(<StatusBadge status="pending" />);
    expect(screen.getByLabelText("審核中")).toBeTruthy();
  });
});

describe("PriceTag", () => {
  it("shows price, free, or owned badge", async () => {
    await wrap(<PriceTag amount={158} />);
    expect(screen.getByText("HK$158")).toBeTruthy();
    await wrap(<PriceTag amount={0} />);
    expect(screen.getByText("免費")).toBeTruthy();
    await wrap(<PriceTag amount={158} owned />);
    expect(screen.getByLabelText("已購")).toBeTruthy();
  });
});

describe("RatingStars", () => {
  it("announces rating and count", async () => {
    await wrap(<RatingStars value={4.5} count={23} />);
    expect(screen.getByLabelText("4.5 星，共 23 則評價")).toBeTruthy();
  });
  it("shows 'new' with fewer than 3 reviews", async () => {
    await wrap(<RatingStars value={5} count={2} />);
    expect(screen.getByText("新上架")).toBeTruthy();
  });
});

describe("LaunchMark", () => {
  it("shows the product name and its subtitle in every language", async () => {
    for (const locale of ["zh-Hant", "en"] as const) {
      useSettings.setState({ locale });
      await wrap(<LaunchMark />);
      expect(screen.getByText("VCseed")).toBeTruthy();
      expect(screen.getByText("Vibe coding incubator")).toBeTruthy();
    }
  });

  it("plays the whole opening before letting the app show", async () => {
    jest.useFakeTimers();
    const onFinish = jest.fn();
    const onReady = jest.fn();
    await wrap(<LaunchMark onFinish={onFinish} onReady={onReady} />);
    expect(onReady).toHaveBeenCalled(); // hides the native splash once the page is up
    jest.advanceTimersByTime(INTRO_MS - 100);
    expect(onFinish).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(onFinish).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
