import type { MemberRole } from "@prisma/client";
import type { ChipProps } from "@mui/material";

export type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  role: MemberRole;
  isOwner: boolean;
};

export type WorkspaceListUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type WorkspacesListProps = {
  workspaces: WorkspaceListItem[];
  currentUser: WorkspaceListUser;
};

export type RoleChipColor = Exclude<ChipProps["color"], undefined>;

export type RoleVisual = {
  label: string;
  color: RoleChipColor;
  variant: ChipProps["variant"];
};
