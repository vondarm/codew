import type { Metadata } from "next";

import { AppThemeProvider } from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeW Workspace",
  description: "Starter workspace configured with Next.js, Material UI, and Prisma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
