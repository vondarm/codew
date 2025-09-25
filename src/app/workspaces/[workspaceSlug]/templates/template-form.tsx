"use client";

import { type ReactNode, useActionState, useEffect, useMemo, useState } from "react";
import type { TemplateLanguage } from "@prisma/client";
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";

import { createTemplateAction, updateTemplateAction } from "./actions";
import { templateActionIdleState } from "./template-action-state";

export type TemplateFormMode = "create" | "edit";

type TemplateFormRenderProps = {
  fields: ReactNode;
  actions: ReactNode;
  isPending: boolean;
};

type TemplateFormProps = {
  mode: TemplateFormMode;
  workspaceId: string;
  languages: TemplateLanguage[];
  template?: SerializedTemplate | null;
  onCancel?: () => void;
  onSuccess: (message: string) => void;
  onPendingChange?: (pending: boolean) => void;
  submitLabel?: string;
  cancelLabel?: string;
  children: (props: TemplateFormRenderProps) => ReactNode;
};

export default function TemplateForm({
  mode,
  workspaceId,
  languages,
  template,
  onCancel,
  onSuccess,
  onPendingChange,
  submitLabel,
  cancelLabel,
  children,
}: TemplateFormProps) {
  const action = useMemo(
    () => (mode === "create" ? createTemplateAction : updateTemplateAction),
    [mode],
  );

  const [state, formAction, isPending] = useActionState(action, templateActionIdleState);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const defaultLanguage = languages[0] ?? ("JAVASCRIPT" as TemplateLanguage);

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [hiddenDescription, setHiddenDescription] = useState(template?.hiddenDescription ?? "");
  const [language, setLanguage] = useState<TemplateLanguage>(template?.language ?? defaultLanguage);
  const [content, setContent] = useState(template?.content ?? "");

  useEffect(() => {
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setHiddenDescription(template?.hiddenDescription ?? "");
    setLanguage(template?.language ?? defaultLanguage);
    setContent(template?.content ?? "");
  }, [defaultLanguage, template]);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? (mode === "create" ? "Шаблон создан." : "Шаблон обновлён."));
    }
  }, [mode, onSuccess, state.message, state.status]);

  const resolvedSubmitLabel = submitLabel ?? (mode === "create" ? "Создать" : "Сохранить");
  const resolvedCancelLabel = cancelLabel ?? "Отмена";

  const fields = (
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
        helperText={state.fieldErrors?.name ?? "Например, 'Запрос к API' или 'Компонент карточки'."}
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
          state.fieldErrors?.description ?? "Короткое описание для членов команды (необязательно)."
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
      <FormControl fullWidth disabled={isPending} error={Boolean(state.fieldErrors?.language)}>
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
        fullWidth
        multiline
        minRows={8}
        disabled={isPending}
        error={Boolean(state.fieldErrors?.content)}
        helperText={
          state.fieldErrors?.content ??
          "Вставьте фрагмент кода или текст, который хотите переиспользовать (необязательно)."
        }
      />
    </Stack>
  );

  const actions = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent="flex-end"
      sx={{ pt: 2 }}
    >
      {onCancel ? (
        <Button type="button" onClick={onCancel} disabled={isPending}>
          {resolvedCancelLabel}
        </Button>
      ) : null}
      <Button type="submit" variant="contained" disabled={isPending}>
        {isPending ? <CircularProgress size={20} /> : resolvedSubmitLabel}
      </Button>
    </Stack>
  );

  return (
    <form action={formAction} style={{ height: "100%" }}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {mode === "edit" && template ? (
        <input type="hidden" name="templateId" value={template.id} />
      ) : null}
      {children({ fields, actions, isPending })}
    </form>
  );
}

export function languageLabel(language: TemplateLanguage): string {
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
