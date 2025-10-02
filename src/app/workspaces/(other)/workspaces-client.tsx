"use client";

import { ChangeEvent, startTransition, useActionState } from "react";
import { useMemo, useState } from "react";
import type { MemberRole } from "@prisma/client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import type { WorkspaceActionState } from "./actions";
import { createWorkspaceAction, deleteWorkspaceAction, updateWorkspaceAction } from "./actions";
import { slugify, withSlugFallback } from "@/lib/utils/slugify";

import { ROUTES } from "@/routes";
import Link from "next/link";
import { useNotification } from "@/app/notification-provider";
import { useForm, withHandlers } from "@/shared/forms";
import { RoleChip } from "@/app/workspaces/_components/RoleChip";

export type SerializedWorkspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  role: MemberRole;
  isOwner: boolean;
};

type CurrentUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type WorkspacesClientProps = {
  workspaces: SerializedWorkspace[];
  currentUser: CurrentUserSummary;
};

const idleState: WorkspaceActionState = { status: "idle" };

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function autoSlugFromName(name: string): string {
  if (!name.trim()) {
    return "";
  }

  return withSlugFallback(slugify(name));
}

type WorkspaceFormValue = Pick<SerializedWorkspace, "name" | "slug">;

const INITIAL_WORKSPACE: WorkspaceFormValue = {
  name: "",
  slug: "",
};

type WorkspaceFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function CreateWorkspaceDialog({ open, onClose, onSuccess }: WorkspaceFormProps) {
  const [slugLocked, setSlugLocked] = useState(false);
  const { formValue, set, action, state, isPending, reset } = useForm(
    null,
    createWorkspaceAction,
    idleState,
    {
      onSuccess: () => {
        onSuccess("Рабочая область создана.");
        onClose();
        setSlugLocked(false);
      },
    },
    INITIAL_WORKSPACE,
  );

  const cancel = () => {
    reset();
    onClose();
    setSlugLocked(false);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    set("name")(value);

    if (!slugLocked) {
      const next = autoSlugFromName(value);

      if (formValue.slug !== next) {
        set("slug")(next);
      }
    }
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    if (!rawValue.trim()) {
      setSlugLocked(false);
      set("slug")("");
      return;
    }

    setSlugLocked(true);
    set("slug")(withSlugFallback(slugify(rawValue)));
  };

  return (
    <Dialog open={open} onClose={cancel} fullWidth maxWidth="sm">
      <form action={action}>
        <DialogTitle>Создать рабочую область</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <TextField
              autoFocus
              label="Название"
              name="name"
              value={formValue.name}
              onChange={handleNameChange}
              required
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.name)}
              helperText={state.fieldErrors?.name ?? "Укажите понятное название рабочей области."}
            />
            <TextField
              label="Slug"
              name="slug"
              value={formValue.slug}
              onChange={handleSlugChange}
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.slug)}
              helperText={
                state.fieldErrors?.slug ??
                "Используется в URL. Можно оставить пустым, чтобы slug сгенерировался автоматически."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={cancel} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Создать"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

type EditWorkspaceDialogProps = WorkspaceFormProps & {
  workspace: SerializedWorkspace | null;
};

function EditWorkspaceDialog({ open, onClose, onSuccess, workspace }: EditWorkspaceDialogProps) {
  const { formValue, set, action, state, isPending, reset } = useForm<
    WorkspaceFormValue,
    WorkspaceActionState
  >(
    workspace,
    updateWorkspaceAction,
    idleState,
    {
      onSuccess: ({ message }) => {
        onSuccess(message || "");
        onClose();
      },
    },
    INITIAL_WORKSPACE,
  );

  const cancel = () => {
    onClose();
    reset();
  };

  if (!workspace) {
    return null;
  }

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    set("name")(value);
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    set("slug")(withSlugFallback(slugify(rawValue)));
  };

  return (
    <Dialog open={open} onClose={cancel} fullWidth maxWidth="sm">
      <form action={action}>
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <DialogTitle>Редактировать рабочую область</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <TextField
              autoFocus
              label="Название"
              name="name"
              value={formValue.name}
              onChange={handleNameChange}
              required
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.name)}
              helperText={
                state.fieldErrors?.name ?? "Название отображается в списках и на страницах."
              }
            />
            <TextField
              label="Slug"
              name="slug"
              value={formValue.slug}
              onChange={handleSlugChange}
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.slug)}
              helperText={
                state.fieldErrors?.slug ??
                "Slug формирует URL рабочей области. Оставьте пустым, чтобы пересчитать автоматически."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={cancel} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Сохранить"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

type DeleteWorkspaceDialogProps = {
  workspace: SerializedWorkspace | null;
  open: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

function DeleteWorkspaceDialog({
  open,
  onClose,
  onSuccess,
  workspace,
}: DeleteWorkspaceDialogProps) {
  const [, deleteAction, isPending] = useActionState(
    withHandlers(deleteWorkspaceAction)({
      onSuccess: ({ message }) => {
        onSuccess(message || "");
        onClose();
      },
      onError: ({ message }) => onSuccess(message || ""),
    }),
    idleState,
  );

  if (!workspace) {
    return null;
  }

  const deleteWorkspace = () => startTransition(() => deleteAction(workspace.id));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Удалить рабочую область</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2} mt={1}>
          <Typography>
            Вы уверены, что хотите удалить рабочую область «{workspace.name}»? Это действие нельзя
            отменить.
          </Typography>
          <Chip label={workspace.slug} variant="outlined" sx={{ alignSelf: "flex-start" }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button onClick={deleteWorkspace} color="error" variant="contained" disabled={isPending}>
          {isPending ? <CircularProgress size={20} /> : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function WorkspacesClient({ workspaces }: WorkspacesClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<SerializedWorkspace | null>(null);
  const [deleteWorkspace, setDeleteWorkspace] = useState<SerializedWorkspace | null>(null);
  const notify = useNotification();

  const sortedWorkspaces = useMemo(
    () => workspaces.toSorted((a, b) => a.name.localeCompare(b.name, "ru")),
    [workspaces],
  );

  const closeCreate = () => {
    setCreateOpen(false);
  };

  const closeEdit = () => {
    setEditWorkspace(null);
  };

  const closeDelete = () => {
    setDeleteWorkspace(null);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography component="h1" variant="h1" gutterBottom>
              Рабочие области
            </Typography>
            <Typography color="text.secondary">
              Управляйте пространствами команды, создавайте новые и настраивайте slug для URL.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Создать область
          </Button>
        </Stack>

        <Card variant="outlined">
          <CardContent>
            {sortedWorkspaces.length === 0 ? (
              <Stack spacing={2} textAlign="center" alignItems="center" py={4}>
                <Typography variant="h6">У вас пока нет рабочих областей</Typography>
                <Typography color="text.secondary">
                  Создайте первую рабочую область, чтобы начать планирование проектов и организацию
                  команд.
                </Typography>
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
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
                  {sortedWorkspaces.map((workspace) => {
                    return (
                      <TableRow key={workspace.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{workspace.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={workspace.slug} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <RoleChip workspace={workspace} />
                        </TableCell>
                        <TableCell>{formatDate(workspace.createdAt)}</TableCell>
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
                              onClick={() => setEditWorkspace(workspace)}
                              disabled={!workspace.isOwner}
                            >
                              Изменить
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => setDeleteWorkspace(workspace)}
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
      </Stack>

      <CreateWorkspaceDialog
        open={createOpen}
        onClose={closeCreate}
        onSuccess={(message) => notify({ message, severity: "success" })}
      />
      <EditWorkspaceDialog
        open={Boolean(editWorkspace)}
        onClose={closeEdit}
        onSuccess={(message) => notify({ message, severity: "success" })}
        workspace={editWorkspace}
      />
      <DeleteWorkspaceDialog
        open={Boolean(deleteWorkspace)}
        onClose={closeDelete}
        onSuccess={(message) => notify({ message, severity: "success" })}
        onError={(message) => notify({ message, severity: "error" })}
        workspace={deleteWorkspace}
      />
    </Container>
  );
}

export default WorkspacesClient;
