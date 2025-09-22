"use client";

import { useEffect, useMemo, useState } from "react";
import type { MemberRole, TemplateLanguage } from "@prisma/client";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";
import { ROUTES } from "@/routes";

import TemplateFormDialog from "./template-form-dialog";
import TemplateDeleteDialog from "./template-delete-dialog";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type CurrentUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: MemberRole;
};

type TemplatesClientProps = {
  workspace: WorkspaceSummary;
  templates: SerializedTemplate[];
  languageOptions: TemplateLanguage[];
  canManage: boolean;
  currentUser: CurrentUserSummary;
};

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

type LanguageFilterValue = TemplateLanguage | "ALL";

const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Администратор",
  EDITOR: "Редактор",
  VIEWER: "Наблюдатель",
};

const LANGUAGE_LABELS: Record<string, string> = {
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
  REACT: "React",
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function TemplatesClient({
  workspace,
  templates,
  languageOptions,
  canManage,
  currentUser,
}: TemplatesClientProps) {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [filterLanguage, setFilterLanguage] = useState<LanguageFilterValue>("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDialogKey, setCreateDialogKey] = useState(0);
  const [editTarget, setEditTarget] = useState<SerializedTemplate | null>(null);
  const [editDialogKey, setEditDialogKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SerializedTemplate | null>(null);
  const [deleteDialogKey, setDeleteDialogKey] = useState(0);

  const filteredTemplates = useMemo(() => {
    if (filterLanguage === "ALL") {
      return templates;
    }

    return templates.filter((template) => template.language === filterLanguage);
  }, [filterLanguage, templates]);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    setSelectedTemplateId((current) => {
      if (current && templates.some((template) => template.id === current)) {
        return current;
      }

      return null;
    });
  }, [templates]);

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    setSelectedTemplateId((current) => {
      if (current && filteredTemplates.some((template) => template.id === current)) {
        return current;
      }

      return null;
    });
  }, [filteredTemplates]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 6000);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const handleFeedback = (message: string, severity: "success" | "error" = "success") => {
    setFeedback({ message, severity });
  };

  const openCreateDialog = () => {
    setIsCreateOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    setCreateDialogKey((value) => value + 1);
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    setEditDialogKey((value) => value + 1);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteDialogKey((value) => value + 1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography component="h1" variant="h1" gutterBottom>
              Шаблоны
            </Typography>
            <Typography color="text.secondary">
              Переиспользуйте общие фрагменты кода, чтобы ускорить разработку и выровнять стиль
              команды.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={ROUTES.workspaces} variant="outlined">
              К рабочим областям
            </Button>
            <Button component={Link} href={ROUTES.workspace(workspace.slug)} variant="outlined">
              Участники
            </Button>
          </Stack>
        </Stack>

        {feedback ? (
          <Alert
            severity={feedback.severity}
            onClose={() => setFeedback(null)}
            sx={{ alignSelf: "flex-start", minWidth: { xs: "100%", sm: 360 } }}
          >
            {feedback.message}
          </Alert>
        ) : null}

        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h5" gutterBottom>
                  {workspace.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={workspace.slug} variant="outlined" size="small" />
                  <Chip label={`Ваша роль: ${ROLE_LABELS[currentUser.role]}`} size="small" />
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                {canManage ? (
                  <Button variant="contained" onClick={openCreateDialog}>
                    Новый шаблон
                  </Button>
                ) : null}
              </Stack>
            </Stack>
            {!canManage ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                У вас права только на просмотр шаблонов в этой рабочей области.
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Typography variant="h6">Библиотека шаблонов</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="templates-filter-label">Язык</InputLabel>
                <Select
                  labelId="templates-filter-label"
                  label="Язык"
                  value={filterLanguage}
                  onChange={(event) => setFilterLanguage(event.target.value as LanguageFilterValue)}
                >
                  <MenuItem value="ALL">Все языки</MenuItem>
                  {languageOptions.map((language) => (
                    <MenuItem key={language} value={language}>
                      {LANGUAGE_LABELS[language] ?? language}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Divider sx={{ my: 2 }} />
            {filteredTemplates.length === 0 ? (
              <Typography color="text.secondary">
                {templates.length === 0
                  ? "Пока нет ни одного шаблона. Создайте первый, чтобы команда могла переиспользовать код."
                  : "Нет шаблонов, соответствующих выбранному фильтру."}
              </Typography>
            ) : (
              <List disablePadding>
                {filteredTemplates.map((template) => (
                  <ListItem
                    key={template.id}
                    disablePadding
                    secondaryAction={
                      canManage ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditTarget(template);
                            }}
                          >
                            Редактировать
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(template);
                            }}
                          >
                            Удалить
                          </Button>
                        </Stack>
                      ) : undefined
                    }
                  >
                    <ListItemButton
                      selected={selectedTemplateId === template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <ListItemText
                        primary={template.name}
                        secondary={`${LANGUAGE_LABELS[template.language] ?? template.language} • обновлён ${formatDate(template.updatedAt)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            {selectedTemplate ? (
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Box>
                    <Typography variant="h5">{selectedTemplate.name}</Typography>
                    {selectedTemplate.description ? (
                      <Typography color="text.secondary">{selectedTemplate.description}</Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={
                        LANGUAGE_LABELS[selectedTemplate.language] ?? selectedTemplate.language
                      }
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`Обновлён ${formatDate(selectedTemplate.updatedAt)}`}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
                {canManage && selectedTemplate.hiddenDescription ? (
                  <Alert severity="info" sx={{ alignSelf: "stretch" }}>
                    <Typography component="div" variant="subtitle2" gutterBottom>
                      Скрытое описание
                    </Typography>
                    <Typography component="div">{selectedTemplate.hiddenDescription}</Typography>
                  </Alert>
                ) : null}
                <Box
                  component="pre"
                  sx={{
                    bgcolor: "grey.900",
                    color: "grey.100",
                    fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
                    fontSize: 14,
                    px: 2,
                    py: 2,
                    borderRadius: 1,
                    overflowX: "auto",
                  }}
                >
                  {selectedTemplate.content}
                </Box>
              </Stack>
            ) : (
              <Typography color="text.secondary">
                Выберите шаблон, чтобы посмотреть содержимое.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <TemplateFormDialog
        key={`create-${createDialogKey}`}
        open={isCreateOpen}
        mode="create"
        workspaceId={workspace.id}
        languages={languageOptions}
        onClose={closeCreateDialog}
        onSuccess={(message) => handleFeedback(message, "success")}
      />
      <TemplateFormDialog
        key={`edit-${editDialogKey}-${editTarget?.id ?? "none"}`}
        open={Boolean(editTarget)}
        mode="edit"
        workspaceId={workspace.id}
        languages={languageOptions}
        template={editTarget}
        onClose={closeEditDialog}
        onSuccess={(message) => handleFeedback(message, "success")}
      />
      <TemplateDeleteDialog
        key={`delete-${deleteDialogKey}-${deleteTarget?.id ?? "none"}`}
        open={Boolean(deleteTarget)}
        workspaceId={workspace.id}
        template={deleteTarget}
        onClose={closeDeleteDialog}
        onSuccess={(message) => handleFeedback(message, "success")}
      />
    </Container>
  );
}
