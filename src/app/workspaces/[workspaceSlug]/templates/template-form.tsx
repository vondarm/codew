"use client";

import { type ReactNode, useMemo } from "react";
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
import { useForm } from "@/shared/forms";

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
  submitLabel?: string;
  cancelLabel?: string;
  children: (props: TemplateFormRenderProps) => ReactNode;
};

type TemplateFormValue = {
  name: string;
  description: string | null;
  hiddenDescription: string | null;
  language: TemplateLanguage;
  content: string;
};

const BASE_TEMPLATE: TemplateFormValue = {
  name: "",
  description: "",
  hiddenDescription: "",
  language: "JAVASCRIPT",
  content: "",
};

export default function TemplateForm({
  mode,
  workspaceId,
  languages,
  template,
  onCancel,
  onSuccess,
  submitLabel,
  cancelLabel,
  children,
}: TemplateFormProps) {
  const action = useMemo(
    () => (mode === "create" ? createTemplateAction : updateTemplateAction),
    [mode],
  );

  const {
    formValue,
    set,
    action: formAction,
    state,
    isPending,
    reset,
  } = useForm(
    template,
    action,
    templateActionIdleState,
    () => {
      const message = mode === "create" ? "Шаблон создан." : "Шаблон обновлён.";
      onSuccess(message);
    },
    BASE_TEMPLATE,
  );

  const cancel = () => {
    reset();
    onCancel?.();
  };

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
        value={formValue.name}
        onChange={(event) => set("name")(event.target.value)}
        required
        fullWidth
        disabled={isPending}
        error={Boolean(state.fieldErrors?.name)}
        helperText={state.fieldErrors?.name ?? "Например, 'Запрос к API' или 'Компонент карточки'."}
      />
      <TextField
        label="Описание"
        name="description"
        value={formValue.description ?? ""}
        onChange={(event) => set("description")(event.target.value)}
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
        value={formValue.hiddenDescription ?? ""}
        onChange={(event) => set("hiddenDescription")(event.target.value)}
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
          value={formValue.language}
          onChange={(event) => set("language")(event.target.value as TemplateLanguage)}
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
        value={formValue.content}
        onChange={(event) => set("content")(event.target.value)}
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
      {cancel ? (
        <Button type="button" onClick={cancel} disabled={isPending}>
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
