import { Chip, ChipProps } from "@mui/material";
import { MemberRole } from "@prisma/client";

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Администратор",
  EDITOR: "Редактор",
  VIEWER: "Наблюдатель",
};

type RoleChipColor = Exclude<ChipProps["color"], undefined>;

function getRoleVisuals(workspace: { isOwner: boolean; role: MemberRole }): {
  label: string;
  color: RoleChipColor;
} {
  const baseLabel = ROLE_LABELS[workspace.role];
  const label = workspace.isOwner ? `${baseLabel} • владелец` : baseLabel;

  let color: RoleChipColor = "default";

  if (workspace.role === "ADMIN") {
    color = "primary";
  } else if (workspace.role === "EDITOR") {
    color = "info";
  }

  return { label, color };
}

export const RoleChip = ({ workspace }: { workspace: { isOwner: boolean; role: MemberRole } }) => {
  const { label, color } = getRoleVisuals(workspace);
  const variant = color === "default" ? "outlined" : "filled";

  return <Chip label={label} size="small" color={color} variant={variant} />;
};
