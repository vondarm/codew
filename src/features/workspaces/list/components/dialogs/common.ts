import type { WorkspaceActionState } from "@/app/workspaces/actions";
import { slugify, withSlugFallback } from "@/lib/utils/slugify";

import type { WorkspaceListItem } from "../../types";

export const idleState: WorkspaceActionState = { status: "idle" };

export type WorkspaceFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export type EditWorkspaceDialogProps = WorkspaceFormDialogProps & {
  workspace: WorkspaceListItem | null;
};

export type DeleteWorkspaceDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  workspace: WorkspaceListItem | null;
};

export function autoSlugFromName(name: string): string {
  if (!name.trim()) {
    return "";
  }

  return withSlugFallback(slugify(name));
}
