import { render, screen } from "@testing-library/react-native";
import fs from "fs";
import path from "path";
import { Icon, ICONS } from "../Icon";

describe("Icon", () => {
  // Icons are decorative (hidden from screen readers); the label lives on the button.
  it("stacks outline and filled glyphs so state changes morph instead of swap", async () => {
    await render(<Icon name="heart" color="#000" active />);
    expect(screen.getByText("heart-outline", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("heart", { includeHiddenElements: true })).toBeTruthy();
  });

  it("maps every logical name to an Ionicons glyph that has an outline twin", () => {
    const glyphs = require("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json") as Record<string, number>;
    for (const base of Object.values(ICONS)) {
      expect(glyphs[base]).toBeDefined();
      expect(glyphs[`${base}-outline`]).toBeDefined();
    }
  });
});

describe("no SVG", () => {
  const root = path.resolve(__dirname, "../../../..");
  it("has no SVG libraries in dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /svg|lucide|victory/i.test(d))).toEqual([]);
  });
  it("never imports SVG in source", () => {
    const files: string[] = [];
    const walk = (dir: string) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(dir, e.name))));
    walk(path.join(root, "src"));
    const offenders = files.filter((f) => !f.endsWith("icon.test.tsx") && /from ["'](react-native-svg|lucide-react-native)|<svg/i.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
