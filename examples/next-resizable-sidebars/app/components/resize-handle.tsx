"use client";

import { useCallback, useRef, useState } from "react";

interface ResizeHandleProps {
  side: "left" | "right";
  value: string;
  setValue: (value: string) => void;
}

export function ResizeHandle({ side, value, setValue }: ResizeHandleProps) {
  const [active, setActive] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setActive(true);
      startX.current = e.clientX;
      startWidth.current = Number(value);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active) return;
      const delta =
        side === "left"
          ? e.clientX - startX.current
          : startX.current - e.clientX;
      const next = Math.min(480, Math.max(180, startWidth.current + delta));
      setValue(String(Math.round(next)));
    },
    [active, side, setValue],
  );

  const onPointerUp = useCallback(() => {
    setActive(false);
  }, []);

  return (
    <div
      className={`relative z-10 w-1.5 shrink-0 cursor-col-resize transition-colors hover:bg-blue-500 ${active ? "bg-blue-500" : "bg-transparent"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
