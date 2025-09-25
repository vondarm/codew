"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { MemberRole } from "@prisma/client";
import Link from "next/link";
import {
  Alert,
  Avatar,
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
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  inviteMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
  memberActionIdleState,
} from "./members-actions";
import { ROUTES } from "@/routes";

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Администратор",
  EDITOR: "Редактор",
  VIEWER: "Наблюдатель",
};

const ROLE_OPTIONS: MemberRole[] = ["ADMIN", "EDITOR", "VIEWER"];

const ROLE_ORDER: Record<MemberRole, number> = {
  ADMIN: 0,
  EDITOR: 1,
  VIEWER: 2,
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type UserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type SerializedMember = {
  id: string;
  role: MemberRole;
  createdAt: string;
  isOwner: boolean;
  user: UserSummary;
};

type MembersClientProps = {
  workspace: WorkspaceSummary;
  members: SerializedMember[];
  currentUser: UserSummary;
};

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

function InviteMemberForm({
  workspaceId,
  onSuccess,
}: {
  workspaceId: string;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(inviteMemberAction, memberActionIdleState);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("EDITOR");

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Пользователь добавлен.");
      setEmail("");
      setRole("EDITOR");
    }
  }, [onSuccess, state.message, state.status]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Stack spacing={2}>
        {state.status === "error" && state.message ? (
          <Alert severity="error">{state.message}</Alert>
        ) : null}
        <TextField
          label="Email участника"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
          disabled={isPending}
          error={Boolean(state.fieldErrors?.email)}
          helperText={state.fieldErrors?.email ?? "Укажите email существующего пользователя CodeW."}
        />
        <FormControl fullWidth disabled={isPending} error={Boolean(state.fieldErrors?.role)}>
          <InputLabel id="invite-role-label">Роль</InputLabel>
          <Select
            labelId="invite-role-label"
            label="Роль"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
          >
            {ROLE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {ROLE_LABELS[option]}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {state.fieldErrors?.role ?? "Определяет доступ участника к настройкам и комнатам."}
          </FormHelperText>
        </FormControl>
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Пригласить"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

type ChangeRoleDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  workspaceId: string;
  member: SerializedMember | null;
};

function ChangeRoleDialog({
  open,
  onClose,
  onSuccess,
  workspaceId,
  member,
}: ChangeRoleDialogProps) {
  const [state, formAction, isPending] = useActionState(
    changeMemberRoleAction,
    memberActionIdleState,
  );
  const [role, setRole] = useState<MemberRole>(member?.role ?? "EDITOR");

  useEffect(() => {
    if (open && member) {
      setRole(member.role);
    }
  }, [member, open]);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Роль обновлена.");
      onClose();
    }
  }, [onClose, onSuccess, state.message, state.status]);

  if (!member) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="memberId" value={member.id} />
        <DialogTitle>Изменить роль участника</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <Box>
              <Typography fontWeight={600}>
                {member.user.name ?? member.user.email ?? "Без имени"}
              </Typography>
              {member.user.email ? (
                <Typography color="text.secondary" variant="body2">
                  {member.user.email}
                </Typography>
              ) : null}
            </Box>
            <FormControl fullWidth disabled={isPending} error={Boolean(state.fieldErrors?.role)}>
              <InputLabel id="change-role-label">Роль</InputLabel>
              <Select
                labelId="change-role-label"
                label="Роль"
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value as MemberRole)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {state.fieldErrors?.role ??
                  "Администратор может управлять участниками и настройками."}
              </FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isPending}>
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

type RemoveMemberDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  workspaceId: string;
  member: SerializedMember | null;
};

function RemoveMemberDialog({
  open,
  onClose,
  onSuccess,
  workspaceId,
  member,
}: RemoveMemberDialogProps) {
  const [state, formAction, isPending] = useActionState(removeMemberAction, memberActionIdleState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Участник удалён.");
      onClose();
    }
  }, [onClose, onSuccess, state.message, state.status]);

  if (!member) {
    return null;
  }

  const primaryText = member.user.name ?? member.user.email ?? "Без имени";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="memberId" value={member.id} />
        <DialogTitle>Удалить участника</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <Typography>
              Удалить участника «{primaryText}» из рабочей области? Пользователь потеряет доступ ко
              всем комнатам и настройкам.
            </Typography>
            {member.user.email ? <Chip label={member.user.email} variant="outlined" /> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" color="error" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Удалить"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function MembersClient({ workspace, members, currentUser }: MembersClientProps) {
  const [changeTarget, setChangeTarget] = useState<SerializedMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SerializedMember | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];

      if (roleDiff !== 0) {
        return roleDiff;
      }

      const nameA = a.user.name ?? a.user.email ?? "";
      const nameB = b.user.name ?? b.user.email ?? "";

      return nameA.localeCompare(nameB, "ru");
    });
  }, [members]);

  const adminCount = useMemo(
    () => members.filter((member) => member.role === "ADMIN").length,
    [members],
  );

  const handleFeedback = (message: string, severity: "success" | "error" = "success") => {
    setFeedback({ message, severity });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography component="h1" variant="h1" gutterBottom>
              Участники
            </Typography>
            <Typography color="text.secondary">
              Управляйте доступом членов команды, назначайте роли и удаляйте участников рабочей
              области.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={ROUTES.workspaces} variant="outlined">
              К рабочим областям
            </Button>
            <Button component={Link} href={ROUTES.workspaceRooms(workspace.id)} variant="outlined">
              Комнаты
            </Button>
            <Button
              component={Link}
              href={ROUTES.workspaceTemplates(workspace.slug)}
              variant="outlined"
            >
              Шаблоны
            </Button>
          </Stack>
        </Stack>

        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h5" gutterBottom>
                  {workspace.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={workspace.slug} variant="outlined" size="small" />
                  <Chip
                    label={`Администраторы: ${adminCount}`}
                    size="small"
                    color={adminCount > 1 ? "success" : "warning"}
                  />
                </Stack>
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  {sortedMembers.length} участник(а)
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Пригласить участника
            </Typography>
            <InviteMemberForm
              workspaceId={workspace.id}
              onSuccess={(message) => handleFeedback(message, "success")}
            />
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Текущие участники
            </Typography>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Участник</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Добавлен</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMembers.map((member) => {
                  const name = member.user.name ?? member.user.email ?? "Без имени";
                  const isCurrentUser = member.user.id === currentUser.id;
                  const roleLabel = ROLE_LABELS[member.role];
                  const joinLabel = formatDate(member.createdAt);

                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={member.user.image ?? undefined}
                            alt={name}
                            sx={{ width: 40, height: 40 }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={600}>{name}</Typography>
                              {isCurrentUser ? (
                                <Chip label="Это вы" size="small" color="info" variant="outlined" />
                              ) : null}
                              {member.isOwner ? (
                                <Chip
                                  label="Владелец"
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              ) : null}
                            </Stack>
                            {member.user.email && member.user.email !== name ? (
                              <Typography color="text.secondary" variant="body2">
                                {member.user.email}
                              </Typography>
                            ) : null}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleLabel}
                          size="small"
                          color={
                            member.role === "ADMIN"
                              ? "primary"
                              : member.role === "EDITOR"
                                ? "info"
                                : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>{joinLabel}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setChangeTarget(member)}
                          >
                            Изменить роль
                          </Button>
                          <Tooltip
                            title={
                              member.role === "ADMIN" && adminCount === 1
                                ? "Нельзя удалить последнего администратора"
                                : ""
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                onClick={() => setRemoveTarget(member)}
                                disabled={member.role === "ADMIN" && adminCount === 1}
                              >
                                Удалить
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>

      <ChangeRoleDialog
        open={Boolean(changeTarget)}
        onClose={() => setChangeTarget(null)}
        onSuccess={(message) => handleFeedback(message, "success")}
        workspaceId={workspace.id}
        member={changeTarget}
      />

      <RemoveMemberDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onSuccess={(message) => handleFeedback(message, "success")}
        workspaceId={workspace.id}
        member={removeTarget}
      />

      {feedback ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Alert
            severity={feedback.severity}
            sx={{ pointerEvents: "auto" }}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        </Box>
      ) : null}
    </Container>
  );
}
