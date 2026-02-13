"use client";

import { leftSidebarWidth, rightSidebarWidth } from "../prehydrate";
import { ResizeHandle } from "./resize-handle";

const values = {
  left: leftSidebarWidth,
  right: rightSidebarWidth,
};

function WidthLabel({ side }: { side: "left" | "right" }) {
  const [width] = values[side].useHydratedValue();
  if (width === null) {
    return (
      <span className="inline-block h-[1em] w-12 rounded bg-neutral-800 skeleton-pulse" />
    );
  }
  return <span>{width}px</span>;
}

interface SidebarProps {
  side: "left" | "right";
  title: string;
  items: string[];
}

export function Sidebar({ side, title, items }: SidebarProps) {
  const [value, setValue] = values[side].useValue();
  const widthClass = side === "left" ? "sidebar-w-left" : "sidebar-w-right";
  const borderClass = side === "left" ? "border-r" : "border-l";

  const aside = (
    <aside
      className={`${widthClass} flex shrink-0 flex-col overflow-y-auto ${borderClass} border-border bg-panel`}
    >
      <div className="border-b border-border p-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </div>
      <div className="flex-1 p-4">
        {items.map((item) => (
          <div
            key={item}
            className="cursor-default rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-surface"
          >
            {item}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-border px-4 py-3 text-xs text-neutral-500">
        Width: <WidthLabel side={side} />
      </div>
    </aside>
  );

  const handle = <ResizeHandle side={side} value={value} setValue={setValue} />;

  return side === "left" ? (
    <>
      {aside}
      {handle}
    </>
  ) : (
    <>
      {handle}
      {aside}
    </>
  );
}
