import { LICENSES, licenseRules } from "../license";

describe("licenseRules", () => {
  it("never allows resale or publishing source", () => {
    for (const l of LICENSES) {
      expect(licenseRules(l).resale).toBe(false);
      expect(licenseRules(l).publishSource).toBe(false);
    }
  });
  it("scopes commercial use", () => {
    expect(licenseRules("personal")).toMatchObject({ commercial: false, maxProducts: 1 });
    expect(licenseRules("commercial")).toMatchObject({ commercial: true, maxProducts: 1 });
    expect(licenseRules("extended")).toMatchObject({ commercial: true, maxProducts: "unlimited" });
  });
});
