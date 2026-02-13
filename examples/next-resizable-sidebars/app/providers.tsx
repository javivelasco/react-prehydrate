"use client";

import type { ReactNode } from "react";
import { PrehydrateScript } from "react-prehydrate";
import {
  leftSidebarWidth,
  rightSidebarWidth,
  allPrehydrateValues,
} from "./prehydrate";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <leftSidebarWidth.Provider>
      <rightSidebarWidth.Provider>
        <PrehydrateScript values={allPrehydrateValues} />
        {children}
      </rightSidebarWidth.Provider>
    </leftSidebarWidth.Provider>
  );
}
