"use client";

import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { ROUTES } from "@/routes";

import type { RoleVisual, WorkspaceListItem } from "../types";

type WorkspacesTableProps = {
  workspaces: WorkspaceListItem[];
  onCreateClick: () => void;
  onEdit: (workspace: WorkspaceListItem) => void;
  onDelete: (workspace: WorkspaceListItem) => void;
  getRoleVisuals: (workspace: WorkspaceListItem) => RoleVisual;
  formatWorkspaceDate: (isoDate: string) => string;
};

export function WorkspacesTable({
  workspaces,
  onCreateClick,
  onEdit,
  onDelete,
  getRoleVisuals,
  formatWorkspaceDate,
}: WorkspacesTableProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        {workspaces.length === 0 ? (
          <Stack spacing={2} textAlign="center" alignItems="center" py={4}>
            <Typography variant="h6">У вас пока нет рабочих областей</Typography>
            <Typography color="text.secondary">
              Создайте первую рабочую область, чтобы начать планирование проектов и организацию
              команд.
            </Typography>
            <Button variant="contained" onClick={onCreateClick}>
              Создать рабочую область
            </Button>
          </Stack>
        ) : (
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Ваша роль</TableCell>
                <TableCell>Создано</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspaces.map((workspace) => {
                const { label, color, variant } = getRoleVisuals(workspace);

                return (
                  <TableRow key={workspace.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{workspace.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={workspace.slug} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={label} size="small" color={color} variant={variant} />
                    </TableCell>
                    <TableCell>{formatWorkspaceDate(workspace.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          href={ROUTES.workspaceRooms(workspace.slug)}
                        >
                          Комнаты
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          href={ROUTES.workspaceTemplates(workspace.slug)}
                        >
                          Шаблоны
                        </Button>
                        {workspace.role === "ADMIN" ? (
                          <Button
                            size="small"
                            variant="outlined"
                            component={Link}
                            href={ROUTES.workspace(workspace.slug)}
                          >
                            Участники
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => onEdit(workspace)}
                          disabled={!workspace.isOwner}
                        >
                          Изменить
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          onClick={() => onDelete(workspace)}
                          disabled={!workspace.isOwner}
                        >
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
