"use client";

import { useCallback, useMemo } from "react";

import type { RoleVisual, WorkspaceListItem } from "../types";
import type { RoleChipColor } from "../types";
import type { MemberRole } from "@prisma/client";

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Администратор",
  EDITOR: "Редактор",
  VIEWER: "Наблюдатель",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function useWorkspacesManager(workspaces: WorkspaceListItem[]) {
  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [workspaces],
  );

  const formatWorkspaceDate = useCallback((isoDate: string): string => {
    try {
      return dateFormatter.format(new Date(isoDate));
    } catch {
      return isoDate;
    }
  }, []);

  const getRoleVisuals = useCallback((workspace: WorkspaceListItem): RoleVisual => {
    const baseLabel = ROLE_LABELS[workspace.role];
    const label = workspace.isOwner ? `${baseLabel} • владелец` : baseLabel;

    let color: RoleChipColor = "default";

    if (workspace.role === "ADMIN") {
      color = "primary";
    } else if (workspace.role === "EDITOR") {
      color = "info";
    }

    const variant: RoleVisual["variant"] = color === "default" ? "outlined" : "filled";

    return { label, color, variant };
  }, []);

  return {
    sortedWorkspaces,
    formatWorkspaceDate,
    getRoleVisuals,
  };
}
