import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createPrehydrateValue } from "../index";

const config = {
  cookie: "test-val",
  cssVar: "--test-val",
  defaultValue: "100",
};

describe("createPrehydrateValue", () => {
  beforeEach(() => {
    document.documentElement.style.cssText = "";
    document.cookie = "test-val=; max-age=0";
  });

  describe("returned shape", () => {
    it("returns Provider, useValue, useHydratedValue, and config", () => {
      const val = createPrehydrateValue(config);
      expect(val.Provider).toBeTypeOf("function");
      expect(val.useValue).toBeTypeOf("function");
      expect(val.useHydratedValue).toBeTypeOf("function");
      expect(val.config).toEqual(config);
    });
  });

  describe("useValue", () => {
    it("provides the default value when no CSS var is set", () => {
      const { Provider, useValue } = createPrehydrateValue(config);
      let captured: string | undefined;

      function Consumer() {
        const [value] = useValue();
        captured = value;
        return <span>{value}</span>;
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      expect(captured).toBe("100");
      expect(screen.getByText("100")).toBeDefined();
    });

    it("reads the initial value from the CSS variable", () => {
      document.documentElement.style.setProperty("--test-val", "42");

      const { Provider, useValue } = createPrehydrateValue(config);
      let captured: string | undefined;

      function Consumer() {
        const [value] = useValue();
        captured = value;
        return <span>{value}</span>;
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      expect(captured).toBe("42");
    });

    it("setValue updates React state, CSS variable, and cookie", () => {
      const { Provider, useValue } = createPrehydrateValue(config);

      function Consumer() {
        const [value, setValue] = useValue();
        return (
          <>
            <span data-testid="value">{value}</span>
            <button onClick={() => setValue("999")}>set</button>
          </>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      expect(screen.getByTestId("value").textContent).toBe("100");

      act(() => {
        screen.getByText("set").click();
      });

      expect(screen.getByTestId("value").textContent).toBe("999");
      expect(
        document.documentElement.style.getPropertyValue("--test-val"),
      ).toBe("999");
      expect(document.cookie).toContain("test-val=999");
    });

    it("always returns a string value (never null)", () => {
      const { Provider, useValue } = createPrehydrateValue(config);

      function Consumer() {
        const [value] = useValue();
        return <span data-testid="v">{typeof value}</span>;
      }

      const html = renderToStaticMarkup(
        <Provider>
          <Consumer />
        </Provider>,
      );

      expect(html).toContain("string");
    });

    it("throws outside Provider", () => {
      const { useValue } = createPrehydrateValue(config);

      function Bad() {
        useValue();
        return null;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Bad />)).toThrow(/must be used within a <Provider>/);
      spy.mockRestore();
    });
  });

  describe("useHydratedValue", () => {
    it("returns null during SSR", () => {
      const { Provider, useHydratedValue } = createPrehydrateValue(config);

      function Consumer() {
        const [value] = useHydratedValue();
        return <span>{value === null ? "null" : value}</span>;
      }

      const html = renderToStaticMarkup(
        <Provider>
          <Consumer />
        </Provider>,
      );

      expect(html).toContain("null");
    });

    it("returns the value after hydration", async () => {
      const { Provider, useHydratedValue } = createPrehydrateValue(config);

      function Consumer() {
        const [value] = useHydratedValue();
        return <span data-testid="v">{value === null ? "null" : value}</span>;
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await act(async () => {});
      expect(screen.getByTestId("v").textContent).toBe("100");
    });

    it("provides setValue even before hydration", async () => {
      const { Provider, useHydratedValue } = createPrehydrateValue(config);

      function Consumer() {
        const [value, setValue] = useHydratedValue();
        return (
          <>
            <span data-testid="v">{value ?? "null"}</span>
            <button onClick={() => setValue("555")}>set</button>
          </>
        );
      }

      render(
        <Provider>
          <Consumer />
        </Provider>,
      );

      await act(async () => {});
      expect(screen.getByTestId("v").textContent).toBe("100");

      act(() => {
        screen.getByText("set").click();
      });

      expect(screen.getByTestId("v").textContent).toBe("555");
    });

    it("throws outside Provider", () => {
      const { useHydratedValue } = createPrehydrateValue(config);

      function Bad() {
        useHydratedValue();
        return null;
      }

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Bad />)).toThrow(/must be used within a <Provider>/);
      spy.mockRestore();
    });
  });

  describe("multiple independent values", () => {
    it("each value maintains its own state", () => {
      const val1 = createPrehydrateValue({
        cookie: "v1",
        cssVar: "--v1",
        defaultValue: "a",
      });
      const val2 = createPrehydrateValue({
        cookie: "v2",
        cssVar: "--v2",
        defaultValue: "b",
      });

      let v1: string | undefined;
      let v2: string | undefined;
      let setV1: ((v: string) => void) | undefined;

      function Consumer() {
        const [value1, setter1] = val1.useValue();
        const [value2] = val2.useValue();
        v1 = value1;
        v2 = value2;
        setV1 = setter1;
        return null;
      }

      render(
        <val1.Provider>
          <val2.Provider>
            <Consumer />
          </val2.Provider>
        </val1.Provider>,
      );

      expect(v1).toBe("a");
      expect(v2).toBe("b");

      act(() => {
        setV1!("changed");
      });

      expect(v1).toBe("changed");
      expect(v2).toBe("b");
    });
  });
});
