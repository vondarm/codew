"use client";

import { usePathname } from "next/navigation";
import { Tabs, Tab, Divider } from "@mui/material";
import { FC } from "react";
import { ROUTES } from "@/routes";

interface Props {
  workspaceSlug: string;
}

export const NavigationTabs: FC<Props> = ({ workspaceSlug }) => {
  const pathname = usePathname();

  const NAV = [
    { name: "Участники", href: ROUTES.workspace(workspaceSlug) },
    { name: "Комнаты", href: ROUTES.workspaceRooms(workspaceSlug) },
    { name: "Шаблоны", href: ROUTES.workspaceTemplates(workspaceSlug) },
  ];

  const index = NAV.findIndex((nav) => nav.href === pathname);

  if (index === -1) return null;

  return (
    <>
      <Tabs value={index}>
        {NAV.map((nav) => (
          <Tab key={nav.href} href={nav.href} label={nav.name} />
        ))}
      </Tabs>
      <Divider />
    </>
  );
};
