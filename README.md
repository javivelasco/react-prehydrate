# react-prehydrate

Eliminate flash-of-incorrect-state for user preferences in React Server Component apps.

## The problem

In Next.js RSC apps, user preferences (sidebar widths, themes, panel states) create a tension:

- **Cookies in Server Components** make rendering dynamic, breaking static generation and PPR
- **Client-only state** causes a visible flash as the page renders with defaults then snaps to the user's value

## The solution

An inline `<script>` reads a cookie and sets a CSS variable on `<html>` **before first paint**. The DOM is identical server/client — only CSS values differ. React hydrates without mismatch because `useState` reads the CSS variable already set by the script.

```
Server HTML (static) → Browser parses → Inline script sets CSS var → First paint (correct) → React hydrates (matches)
```

> **Warning:** The inline script is **render-blocking** — every byte delays FCP/LCP. The output is intentionally minimal (~230 bytes for one value, ~50 per additional). Use short cookie names and always combine values into a single `<PrehydrateScript>`.

## Install

```sh
npm install react-prehydrate
```

## Usage

### 1. Define values

```ts
// prehydrate.ts
import { createPrehydrateValue } from "react-prehydrate";

export const sidebarWidth = createPrehydrateValue({
  cookie: "sidebar-width",
  cssVar: "--sidebar-width",
  defaultValue: "280",
});
```

### 2. Add the script and provider

```tsx
// providers.tsx
"use client";

import { PrehydrateScript } from "react-prehydrate";
import { sidebarWidth } from "./prehydrate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <sidebarWidth.Provider>
      <PrehydrateScript values={[sidebarWidth.config]} />
      {children}
    </sidebarWidth.Provider>
  );
}
```

When using multiple values, pass all configs to a single `<PrehydrateScript>` — this shares the cookie-reading helper and reads `document.cookie` once.

### 3. Use the CSS variable

Set a `:root` fallback matching `defaultValue`, then reference the variable:

```css
:root {
  --sidebar-width: 280;
}

.sidebar {
  width: calc(var(--sidebar-width) * 1px);
}
```

With Tailwind CSS v4 you can use `@utility`:

```css
@utility sidebar-w {
  width: calc(var(--sidebar-width) * 1px);
}
```

### 4. Read and write in components

```tsx
"use client";

import { sidebarWidth } from "./prehydrate";

function ResizeHandle() {
  const [width, setWidth] = sidebarWidth.useValue();
  // setWidth triple-writes: React state + CSS variable + cookie
}
```

### 5. Suppress hydration warning on `<html>`

The inline script sets a `style` attribute on `<html>` that the server doesn't know about. This is the only mismatch:

```tsx
<html lang="en" suppressHydrationWarning>
  <body>{children}</body>
</html>
```

## CSS vs text content

Anything driven by **CSS** (layout, colors, spacing) works with no flash.

Rendering the value as **text content** (e.g. `<span>280px</span>`) would cause a hydration mismatch. Use `useHydratedValue()` instead — it returns `null` before hydration:

```tsx
function WidthLabel() {
  const [width] = sidebarWidth.useHydratedValue();
  if (width === null) return <Skeleton />;
  return <span>{width}px</span>;
}
```

## API

### `createPrehydrateValue(config)`

Returns `{ Provider, useValue, useHydratedValue, config }`.

| Config         | Type     | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| `cookie`       | `string` | Cookie name to read/write                          |
| `cssVar`       | `string` | CSS custom property name (e.g., `--sidebar-width`) |
| `defaultValue` | `string` | Fallback when no cookie is set                     |

### `Provider`

Client component that provides context. Wrap your layout with it.

### `useValue()` — for CSS

Returns `[value, setValue]`. `value` is always a `string`. `setValue` triple-writes React state, CSS variable, and cookie.

### `useHydratedValue()` — for text content

Returns `[value, setValue]`. `value` is `null` during SSR and before hydration, `string` after. Use this when rendering the value as text in the React tree.

### `config`

The original config object, for passing to `<PrehydrateScript>`.

### `<PrehydrateScript values={configs} />`

Renders a single inline `<script>` for one or more values.

### `generatePrehydrateScript(configs)`

Returns the raw JS string. Useful for inspection or rendering the script tag yourself.

## Example

See [`examples/next-resizable-sidebars`](./examples/next-resizable-sidebars) for a full Next.js app with resizable sidebars.

## License

MIT
