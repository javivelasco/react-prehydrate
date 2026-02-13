import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generatePrehydrateScript } from "../index";
import type { PrehydrateValueConfig } from "../types";

// Evaluates the generated script with a mocked document environment.
// Returns a map of CSS var name → value that was set.
function evaluateScript(
  script: string,
  cookieString: string,
): Record<string, string> {
  const setProps: Record<string, string> = {};

  const fakeDocument = {
    cookie: cookieString,
    documentElement: {
      style: {
        setProperty(name: string, value: string) {
          setProps[name] = value;
        },
      },
    },
  };

  const fn = new Function("document", script);
  fn(fakeDocument);
  return setProps;
}

describe("generatePrehydrateScript", () => {
  describe("output structure", () => {
    it("returns a self-executing function", () => {
      const script = generatePrehydrateScript([
        { cookie: "sw", cssVar: "--sw", defaultValue: "280" },
      ]);
      expect(script).toMatch(/^\(function\(\)\{/);
      expect(script).toMatch(/\}\(\)\)$/);
    });

    it("contains a single setProperty call for one value", () => {
      const script = generatePrehydrateScript([
        { cookie: "sw", cssVar: "--sw", defaultValue: "280" },
      ]);
      const matches = script.match(/s\.setProperty/g);
      expect(matches).toHaveLength(1);
    });

    it("contains N setProperty calls for N values", () => {
      const script = generatePrehydrateScript([
        { cookie: "a", cssVar: "--a", defaultValue: "1" },
        { cookie: "b", cssVar: "--b", defaultValue: "2" },
        { cookie: "c", cssVar: "--c", defaultValue: "3" },
      ]);
      const matches = script.match(/s\.setProperty/g);
      expect(matches).toHaveLength(3);
    });

    it("reads document.cookie only once", () => {
      const script = generatePrehydrateScript([
        { cookie: "a", cssVar: "--a", defaultValue: "1" },
        { cookie: "b", cssVar: "--b", defaultValue: "2" },
      ]);
      const matches = script.match(/document\.cookie/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe("size", () => {
    it("is under 300 bytes for a single short value", () => {
      const script = generatePrehydrateScript([
        { cookie: "sw", cssVar: "--sw", defaultValue: "280" },
      ]);
      expect(Buffer.byteLength(script)).toBeLessThan(300);
    });

    it("each additional value adds less than 80 bytes", () => {
      const one = generatePrehydrateScript([
        { cookie: "a", cssVar: "--a", defaultValue: "1" },
      ]);
      const two = generatePrehydrateScript([
        { cookie: "a", cssVar: "--a", defaultValue: "1" },
        { cookie: "b", cssVar: "--b", defaultValue: "2" },
      ]);
      expect(Buffer.byteLength(two) - Buffer.byteLength(one)).toBeLessThan(80);
    });
  });

  describe("cookie parsing", () => {
    const config: PrehydrateValueConfig = {
      cookie: "sw",
      cssVar: "--sw",
      defaultValue: "280",
    };

    it("returns default when cookie string is empty", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "");
      expect(result["--sw"]).toBe("280");
    });

    it("finds cookie when it is the only one", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "sw=400");
      expect(result["--sw"]).toBe("400");
    });

    it("finds cookie at the start of the string", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "sw=400; other=1");
      expect(result["--sw"]).toBe("400");
    });

    it("finds cookie in the middle of the string", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "a=1; sw=400; b=2");
      expect(result["--sw"]).toBe("400");
    });

    it("finds cookie at the end of the string", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "a=1; sw=400");
      expect(result["--sw"]).toBe("400");
    });

    it("returns default when cookie is not present", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "a=1; b=2");
      expect(result["--sw"]).toBe("280");
    });

    it("does not match a cookie whose name is a superstring", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "xsw=999");
      expect(result["--sw"]).toBe("280");
    });

    it("does not match a cookie with the name as a suffix", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "my-sw=999; other=1");
      expect(result["--sw"]).toBe("280");
    });

    it("correctly distinguishes name that is a suffix of another cookie", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "x-sw=999; sw=300");
      expect(result["--sw"]).toBe("300");
    });

    it("handles real-world sidebar width scenario", () => {
      const configs: PrehydrateValueConfig[] = [
        {
          cookie: "sidebar-width",
          cssVar: "--sidebar-width",
          defaultValue: "280",
        },
        {
          cookie: "left-sidebar-width",
          cssVar: "--left-sidebar-width",
          defaultValue: "200",
        },
      ];
      const script = generatePrehydrateScript(configs);

      const result = evaluateScript(
        script,
        "left-sidebar-width=350; sidebar-width=300",
      );
      expect(result["--sidebar-width"]).toBe("300");
      expect(result["--left-sidebar-width"]).toBe("350");
    });

    it("handles multiple values with some missing", () => {
      const configs: PrehydrateValueConfig[] = [
        { cookie: "a", cssVar: "--a", defaultValue: "da" },
        { cookie: "b", cssVar: "--b", defaultValue: "db" },
        { cookie: "c", cssVar: "--c", defaultValue: "dc" },
      ];
      const script = generatePrehydrateScript(configs);

      const result = evaluateScript(script, "a=1; c=3");
      expect(result["--a"]).toBe("1");
      expect(result["--b"]).toBe("db");
      expect(result["--c"]).toBe("3");
    });

    it("handles cookie values with special characters", () => {
      const script = generatePrehydrateScript([config]);
      const result = evaluateScript(script, "sw=hello%20world");
      // No decodeURIComponent — value is taken as-is
      expect(result["--sw"]).toBe("hello%20world");
    });
  });
});
