import type { ReactNode } from "react";

export default function ApplicationLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="internal-page">
      <main className="internal-page__main">{children}</main>
    </div>
  );
}
