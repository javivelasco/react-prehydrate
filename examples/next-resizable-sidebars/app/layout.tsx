import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resizable Sidebars — react-prehydrate",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full bg-neutral-950 font-sans text-neutral-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
