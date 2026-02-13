import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { PrehydrateValueConfig, PrehydrateValue } from "./types";

/**
 * Generate a single inline `<script>` body for one or more prehydrate values.
 *
 * The generated code prepends `"; "` to `document.cookie` so that every cookie
 * — including the first — is preceded by `"; "`. This lets us search for
 * `"; name="` with a single `indexOf` call, no boundary checks needed.
 *
 * With multiple values the helper `f` and the cookie string `c` are shared.
 * Each additional value adds only one `s.setProperty(...)` call (~50 bytes).
 *
 * Typical output: ~230 bytes for 1 value, ~280 for 2, <120 after gzip.
 */
export function generatePrehydrateScript(
  configs: PrehydrateValueConfig[],
): string {
  const setters = configs
    .map(
      (c) =>
        `s.setProperty("${c.cssVar}",f("${c.cookie}","${c.defaultValue}"))`,
    )
    .join(";");

  // f(n,d): find cookie `n` in `c`, return its value or default `d`.
  //
  // How it works:
  //   c = "; " + document.cookie          e.g. "; a=1; sw=300; b=2"
  //   p = "; " + n + "="                  e.g. "; sw="
  //   i = c.indexOf(p)                    finds exact cookie boundary
  //   If i < 0 → cookie not found → return default d
  //   Otherwise extract value between (i + p.length) and the next ";"
  //   (or end of string if no ";" follows)
  return [
    "(function(){",
    'var c="; "+document.cookie,',
    "s=document.documentElement.style,",
    "f=function(n,d){",
    'var p="; "+n+"=",i=c.indexOf(p);',
    "if(i<0)return d;",
    'var j=c.indexOf(";",i+1);',
    "return c.substring(i+p.length,j<0?c.length:j)",
    "};",
    setters,
    "}())",
  ].join("");
}

/**
 * React component that renders a single inline `<script>` for one or more
 * prehydrate values. Place this as early as possible in your `<body>` —
 * ideally before any content that depends on the CSS variables.
 *
 * ```tsx
 * <PrehydrateScript values={[sidebarWidth, theme]} />
 * ```
 */
export function PrehydrateScript({
  values,
}: {
  values: PrehydrateValueConfig[];
}) {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: generatePrehydrateScript(values) }}
    />
  );
}

/**
 * Create a prehydrated value backed by a cookie and a CSS variable.
 *
 * Returns `{ Provider, useValue, useHydratedValue, config }`.
 *
 * The inline `<script>` (rendered via {@link PrehydrateScript}) reads the
 * cookie and sets the CSS variable on `<html>` before first paint. The
 * `Provider` initialises React state from that CSS variable so hydration
 * matches. `setValue` triple-writes: React state, CSS variable, and cookie.
 *
 * @example
 * ```ts
 * const sidebarWidth = createPrehydrateValue({
 *   cookie: "sidebar-width",
 *   cssVar: "--sidebar-width",
 *   defaultValue: "280",
 * });
 * ```
 */
export function createPrehydrateValue(
  config: PrehydrateValueConfig,
): PrehydrateValue {
  const Context = createContext<[string, (value: string) => void] | null>(null);

  /**
   * Context provider. Renders no extra DOM — just provides the value to
   * `useValue` and `useHydratedValue` consumers.
   *
   * On the server the value is always `defaultValue`. On the client the
   * initial value is read from the CSS variable (already set by the inline
   * script), falling back to `defaultValue`.
   */
  function Provider({ children }: { children: ReactNode }) {
    const [value, setValue] = useState(() => {
      if (typeof document === "undefined") return config.defaultValue;
      const current = document.documentElement.style.getPropertyValue(
        config.cssVar,
      );
      return current || config.defaultValue;
    });

    const set = useCallback(
      (next: string) => {
        setValue(next);
        document.documentElement.style.setProperty(config.cssVar, next);
        document.cookie = `${config.cookie}=${encodeURIComponent(next)};path=/;max-age=31536000;SameSite=Lax`;
      },
      [config.cssVar, config.cookie],
    );

    return <Context value={[value, set]}>{children}</Context>;
  }

  function useContext_() {
    const ctx = useContext(Context);
    if (ctx === null) {
      throw new Error(
        `useValue/useHydratedValue must be used within a <Provider> for "${config.cookie}"`,
      );
    }
    return ctx;
  }

  /**
   * Read and write the prehydrated value.
   *
   * Use this for CSS-driven rendering where the value drives a CSS variable.
   * The value is always available — no flash, no fallback needed.
   */
  function useValue(): [value: string, setValue: (value: string) => void] {
    return useContext_();
  }

  /**
   * Read and write the prehydrated value, with hydration awareness.
   *
   * Use this when rendering the value as **text content** in the React tree.
   * Returns `null` for the value during SSR and before hydration to avoid
   * a mismatch. Once mounted, returns the actual value.
   */
  function useHydratedValue(): [
    value: string | null,
    setValue: (value: string) => void,
  ] {
    const [value, setValue] = useContext_();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return [mounted ? value : null, setValue];
  }

  return { Provider, useValue, useHydratedValue, config };
}
