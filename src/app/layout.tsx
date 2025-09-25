import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppThemeProvider } from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeW Workspace",
  description: "Starter workspace configured with Next.js, Material UI, and Prisma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
