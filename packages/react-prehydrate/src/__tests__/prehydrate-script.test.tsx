import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PrehydrateScript, generatePrehydrateScript } from "../index";

describe("PrehydrateScript", () => {
  it("renders a script tag with the generated inline JS", () => {
    const configs = [{ cookie: "sw", cssVar: "--sw", defaultValue: "280" }];
    const html = renderToStaticMarkup(<PrehydrateScript values={configs} />);

    expect(html).toContain("<script>");
    expect(html).toContain("</script>");
    expect(html).toContain(generatePrehydrateScript(configs));
  });

  it("renders a single script for multiple values", () => {
    const configs = [
      { cookie: "a", cssVar: "--a", defaultValue: "1" },
      { cookie: "b", cssVar: "--b", defaultValue: "2" },
    ];
    const html = renderToStaticMarkup(<PrehydrateScript values={configs} />);

    // Only one <script> tag
    const scriptTags = html.match(/<script>/g);
    expect(scriptTags).toHaveLength(1);

    // Contains setProperty calls for both values
    expect(html).toContain("--a");
    expect(html).toContain("--b");
  });
});
