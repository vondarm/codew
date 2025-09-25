"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
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
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  Typography,
} from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";
import { ROUTES } from "@/routes";

import TemplateFormDialog from "./template-form-dialog";
import TemplateForm, { languageLabel } from "./template-form";
import TemplateDeleteDialog from "./template-delete-dialog";

type CloseIconProps = ComponentProps<typeof SvgIcon>;

function CloseIcon(props: CloseIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M18.3 5.71a1 1 0 0 0-1.41-1.42L12 9.59 7.11 4.7A1 1 0 0 0 5.7 6.11L10.59 11l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 12.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 11l4.89-4.89Z" />
    </SvgIcon>
  );
}

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [isDrawerPending, setIsDrawerPending] = useState(false);
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

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteDialogKey((value) => value + 1);
  };

  const openDrawerForTemplate = (templateId: string, mode: "view" | "edit" = "view") => {
    setSelectedTemplateId(templateId);
    setDrawerMode(mode);
    setIsDrawerPending(false);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (isDrawerPending) {
      return;
    }

    setIsDrawerOpen(false);
    setDrawerMode("view");
    setIsDrawerPending(false);
  };

  useEffect(() => {
    if (!selectedTemplate) {
      setIsDrawerOpen(false);
      setDrawerMode("view");
    }
  }, [selectedTemplate]);

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
                      {languageLabel(language)}
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
                              openDrawerForTemplate(template.id, "edit");
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
                      onClick={() => openDrawerForTemplate(template.id, "view")}
                    >
                      <ListItemText
                        primary={template.name}
                        secondary={`${languageLabel(template.language)} • обновлён ${formatDate(template.updatedAt)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={isDrawerOpen && Boolean(selectedTemplate)}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420, md: 520 },
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Box>
            <Typography variant="h6">
              {drawerMode === "view" ? "Просмотр шаблона" : "Редактирование шаблона"}
            </Typography>
            {selectedTemplate ? (
              <Typography variant="body2" color="text.secondary">
                {selectedTemplate.name}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={closeDrawer} disabled={isDrawerPending}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {selectedTemplate ? (
          drawerMode === "view" ? (
            <Box sx={{ flex: 1, overflow: "auto" }}>
              <Stack spacing={3} sx={{ p: 3 }}>
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
                      label={languageLabel(selectedTemplate.language)}
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
                    overflow: "auto",
                  }}
                >
                  {selectedTemplate.content}
                </Box>
                {canManage ? (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="flex-end"
                  >
                    <Button
                      variant="contained"
                      onClick={() => openDrawerForTemplate(selectedTemplate.id, "edit")}
                    >
                      Редактировать
                    </Button>
                    <Button
                      color="error"
                      onClick={() => {
                        setDeleteTarget(selectedTemplate);
                      }}
                    >
                      Удалить
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <TemplateForm
                mode="edit"
                workspaceId={workspace.id}
                languages={languageOptions}
                template={selectedTemplate}
                onCancel={() => {
                  setIsDrawerPending(false);
                  setDrawerMode("view");
                }}
                onSuccess={(message) => {
                  handleFeedback(message, "success");
                  setIsDrawerPending(false);
                  setDrawerMode("view");
                }}
                onPendingChange={setIsDrawerPending}
              >
                {({ fields, actions }) => (
                  <Stack sx={{ height: "100%" }}>
                    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>{fields}</Box>
                    <Box sx={{ px: 3, pb: 3, pt: 1 }}>{actions}</Box>
                  </Stack>
                )}
              </TemplateForm>
            </Box>
          )
        ) : null}
      </Drawer>

      <TemplateFormDialog
        key={`create-${createDialogKey}`}
        open={isCreateOpen}
        mode="create"
        workspaceId={workspace.id}
        languages={languageOptions}
        onClose={closeCreateDialog}
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
