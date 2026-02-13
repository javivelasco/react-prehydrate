import { Sidebar } from "./components/sidebar";

export default function Page() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        side="left"
        title="Explorer"
        items={["src/", "components/", "package.json", "tsconfig.json"]}
      />
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">react-prehydrate</h1>
        <p className="max-w-lg text-center text-sm leading-relaxed text-neutral-500">
          Drag the resize handles between the sidebars and the main content
          area. Reload the page — your sidebar widths persist with no flash of
          incorrect layout.
        </p>
        <p className="max-w-lg text-center text-sm leading-relaxed text-neutral-500">
          The sidebar widths are driven by CSS variables set by an inline script
          before first paint. The width labels in the sidebar footers use a
          skeleton until mounted, since text content can&apos;t be prehydrated.
        </p>
      </main>
      <Sidebar
        side="right"
        title="Properties"
        items={["Layout", "Styles", "Computed", "Accessibility"]}
      />
    </div>
  );
}
