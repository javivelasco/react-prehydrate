import { createPrehydrateValue } from "react-prehydrate";

export const leftSidebarWidth = createPrehydrateValue({
  cookie: "left-sidebar-width",
  cssVar: "--left-sidebar-width",
  defaultValue: "280",
});

export const rightSidebarWidth = createPrehydrateValue({
  cookie: "right-sidebar-width",
  cssVar: "--right-sidebar-width",
  defaultValue: "280",
});

export const allPrehydrateValues = [
  leftSidebarWidth.config,
  rightSidebarWidth.config,
];
