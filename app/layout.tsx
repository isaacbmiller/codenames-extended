import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Codenames Extended",
  description: "A Horsepaste-style multiplayer Codenames board with public and spymaster views."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
