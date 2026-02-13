/** Configuration for a single prehydrated value. */
export interface PrehydrateValueConfig {
  /** Cookie name used to persist and read the value (e.g. `"sidebar-width"`). */
  cookie: string;
  /** CSS custom property name set on `document.documentElement` (e.g. `"--sidebar-width"`). */
  cssVar: string;
  /** Fallback value used when the cookie is not set. */
  defaultValue: string;
}

/** Object returned by {@link createPrehydrateValue}. */
export interface PrehydrateValue {
  /**
   * Context provider that makes `useValue` and `useHydratedValue` available
   * to descendant components. Wrap your layout with this.
   */
  Provider: React.FC<{ children: React.ReactNode }>;
  /**
   * Hook for CSS-driven rendering. Returns `[value, setValue]` where `value`
   * is always a string — the CSS variable is set before first paint so no
   * flash or fallback is needed.
   */
  useValue: () => [value: string, setValue: (value: string) => void];
  /**
   * Hook for rendering the value as text content. Returns `[value, setValue]`
   * where `value` is `null` during SSR and before hydration to prevent a
   * mismatch, and the actual string once mounted.
   */
  useHydratedValue: () => [
    value: string | null,
    setValue: (value: string) => void,
  ];
  /** The original config, for passing to {@link PrehydrateScript}. */
  config: PrehydrateValueConfig;
}
