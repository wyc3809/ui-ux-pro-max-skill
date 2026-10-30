import { buyoutCosts, FEES, payoutAmount, pct, splitSale } from "../fees";

describe("fee schedule", () => {
  it("splits an in-app sale: store fee first, then AppSeed's share", () => {
    expect(splitSale(158, "ios")).toEqual({ gross: 158, channelFee: 23.7, net: 134.3, platform: 26.86, seller: 107.44 });
    expect(splitSale(158, "android", { largeDeveloper: true }).channelFee).toBe(47.4);
  });

  it("splits a web sale with the card fee, more for overseas cards", () => {
    expect(splitSale(158, "web")).toEqual({ gross: 158, channelFee: 7.72, net: 150.28, platform: 30.06, seller: 120.22 });
    expect(splitSale(158, "web", { intlCard: true }).channelFee).toBeGreaterThan(7.72);
    expect(splitSale(0, "web").seller).toBe(0);
  });

  it("rolls small balances over and takes the transfer fee off payouts", () => {
    expect(payoutAmount(80)).toEqual({ paid: 0, fee: 0, rolledOver: 80 });
    expect(payoutAmount(1000)).toEqual({ paid: 997.25, fee: 2.75, rolledOver: 0 });
  });

  it("shows buyout escrow fee and commission separately", () => {
    expect(buyoutCosts(168000)).toEqual({ escrowFee: 5460, commission: 8400, buyerPays: 173460, sellerReceives: 159600 });
    expect(buyoutCosts(2000)).toMatchObject({ escrowFee: FEES.escrowMinimum, commission: FEES.buyoutCommissionMinimum });
  });

  it("formats rates for the terms", () => {
    expect(pct(0.034)).toBe("3.4%");
    expect(pct(0.0325)).toBe("3.25%");
  });
});
