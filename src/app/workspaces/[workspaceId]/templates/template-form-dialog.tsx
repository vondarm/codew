"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { TemplateLanguage } from "@prisma/client";
import {
  Alert,
  Button,
  CircularProgress,
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
  TextField,
} from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";

import { createTemplateAction, templateActionIdleState, updateTemplateAction } from "./actions";

export type TemplateFormDialogMode = "create" | "edit";

type TemplateFormDialogProps = {
  open: boolean;
  mode: TemplateFormDialogMode;
  workspaceId: string;
  languages: TemplateLanguage[];
  template?: SerializedTemplate | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function TemplateFormDialog({
  open,
  mode,
  workspaceId,
  languages,
  template,
  onClose,
  onSuccess,
}: TemplateFormDialogProps) {
  const action = useMemo(
    () => (mode === "create" ? createTemplateAction : updateTemplateAction),
    [mode],
  );

  const [state, formAction, isPending] = useActionState(action, templateActionIdleState);

  const defaultLanguage = languages[0] ?? ("JAVASCRIPT" as TemplateLanguage);

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [hiddenDescription, setHiddenDescription] = useState(template?.hiddenDescription ?? "");
  const [language, setLanguage] = useState<TemplateLanguage>(template?.language ?? defaultLanguage);
  const [content, setContent] = useState(template?.content ?? "");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setHiddenDescription(template?.hiddenDescription ?? "");
      setLanguage(template?.language ?? defaultLanguage);
      setContent(template?.content ?? "");
    }
  }, [defaultLanguage, open, template]);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? (mode === "create" ? "Шаблон создан." : "Шаблон обновлён."));
      onClose();
    }
  }, [mode, onClose, onSuccess, state.message, state.status]);

  const dialogTitle = mode === "create" ? "Новый шаблон" : "Редактировать шаблон";
  const submitLabel = mode === "create" ? "Создать" : "Сохранить";

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="md">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        {mode === "edit" && template ? (
          <input type="hidden" name="templateId" value={template.id} />
        ) : null}
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <TextField
              label="Название"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.name)}
              helperText={
                state.fieldErrors?.name ?? "Например, 'Запрос к API' или 'Компонент карточки'."
              }
            />
            <TextField
              label="Описание"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              fullWidth
              multiline
              minRows={2}
              error={Boolean(state.fieldErrors?.description)}
              helperText={
                state.fieldErrors?.description ??
                "Короткое описание для членов команды (необязательно)."
              }
            />
            <TextField
              label="Скрытое описание"
              name="hiddenDescription"
              value={hiddenDescription}
              onChange={(event) => setHiddenDescription(event.target.value)}
              disabled={isPending}
              fullWidth
              multiline
              minRows={2}
              error={Boolean(state.fieldErrors?.hiddenDescription)}
              helperText={
                state.fieldErrors?.hiddenDescription ??
                "Видно только интервьюерам и не отображается кандидату (необязательно)."
              }
            />
            <FormControl
              fullWidth
              disabled={isPending}
              error={Boolean(state.fieldErrors?.language)}
            >
              <InputLabel id="template-language-label">Язык</InputLabel>
              <Select
                labelId="template-language-label"
                label="Язык"
                name="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as TemplateLanguage)}
              >
                {languages.map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {languageLabel(lang)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {state.fieldErrors?.language ?? "Определяет подсветку синтаксиса."}
              </FormHelperText>
            </FormControl>
            <TextField
              label="Содержимое"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              fullWidth
              multiline
              minRows={8}
              disabled={isPending}
              error={Boolean(state.fieldErrors?.content)}
              helperText={
                state.fieldErrors?.content ??
                "Вставьте фрагмент кода или текст, который хотите переиспользовать."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function languageLabel(language: TemplateLanguage): string {
  switch (language) {
    case "JAVASCRIPT":
      return "JavaScript";
    case "TYPESCRIPT":
      return "TypeScript";
    case "REACT":
      return "React";
    default:
      return language;
  }
}
