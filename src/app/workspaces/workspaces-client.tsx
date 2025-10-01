"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { MemberRole } from "@prisma/client";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  type ChipProps,
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
import { logout } from "@/lib/auth-client";

import { ROUTES } from "@/routes";
import Link from "next/link";
import { useNotification } from "@/app/notification-provider";
import { useForm } from "@/shared/forms";

type SerializedWorkspace = {
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

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Администратор",
  EDITOR: "Редактор",
  VIEWER: "Наблюдатель",
};

type RoleChipColor = Exclude<ChipProps["color"], undefined>;

function getRoleVisuals(workspace: SerializedWorkspace): {
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
    () => {
      onSuccess("Рабочая область создана.");
      onClose();
      setSlugLocked(false);
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
    () => {
      onSuccess("Изменения сохранены.");
      onClose();
    },
    INITIAL_WORKSPACE,
  );

  const cancel = () => {
    reset();
    onClose();
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

    if (!rawValue.trim()) {
      set("slug")("");
      return;
    }
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
  onSuccess: (message: string) => void;
};

function DeleteWorkspaceDialog({
  open,
  onClose,
  onSuccess,
  workspace,
}: DeleteWorkspaceDialogProps) {
  const [isPending, startTransition] = useTransition();
  const notify = useNotification();

  if (!workspace) {
    return null;
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteWorkspaceAction(workspace.id);

      if (result.status === "success") {
        onSuccess("Рабочая область удалена.");
        onClose();
      } else if (result.message) {
        notify({ severity: "error", message: result.message });
      }
    });
  };

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
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={isPending}>
          {isPending ? <CircularProgress size={20} /> : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function WorkspacesClient({ workspaces, currentUser }: WorkspacesClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<SerializedWorkspace | null>(null);
  const [deleteWorkspace, setDeleteWorkspace] = useState<SerializedWorkspace | null>(null);
  const notify = useNotification();
  const [isLogoutPending, startLogout] = useTransition();

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [workspaces],
  );

  const displayName = currentUser.name ?? currentUser.email ?? "Пользователь";
  const avatarAlt = displayName;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    startLogout(async () => {
      await logout({ callbackUrl: ROUTES.home });
    });
  };

  const handleFeedback = useCallback(
    (message: string) => {
      notify({ message, severity: "success" });
    },
    [notify],
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
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={currentUser.image ?? undefined} alt={avatarAlt}>
                  {avatarFallback}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>{displayName}</Typography>
                  {currentUser.email ? (
                    <Typography color="text.secondary" variant="body2">
                      {currentUser.email}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
              <Button variant="outlined" onClick={handleLogout} disabled={isLogoutPending}>
                {isLogoutPending ? <CircularProgress size={20} /> : "Выйти"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

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
                    const { label, color } = getRoleVisuals(workspace);
                    const variant = color === "default" ? "outlined" : "filled";

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

      <CreateWorkspaceDialog open={createOpen} onClose={closeCreate} onSuccess={handleFeedback} />
      <EditWorkspaceDialog
        open={Boolean(editWorkspace)}
        onClose={closeEdit}
        onSuccess={handleFeedback}
        workspace={editWorkspace}
      />
      <DeleteWorkspaceDialog
        open={Boolean(deleteWorkspace)}
        onClose={closeDelete}
        onSuccess={handleFeedback}
        workspace={deleteWorkspace}
      />
    </Container>
  );
}

export default WorkspacesClient;
