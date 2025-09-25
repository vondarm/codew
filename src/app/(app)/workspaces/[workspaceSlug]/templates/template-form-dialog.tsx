"use client";

import { useState } from "react";
import type { TemplateLanguage } from "@prisma/client";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";

import TemplateForm, { type TemplateFormMode } from "./template-form";

type TemplateFormDialogProps = {
  open: boolean;
  mode: TemplateFormMode;
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
  const [isPending, setIsPending] = useState(false);

  const dialogTitle = mode === "create" ? "Новый шаблон" : "Редактировать шаблон";

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="md">
      <TemplateForm
        mode={mode}
        workspaceId={workspaceId}
        languages={languages}
        template={template}
        onCancel={onClose}
        onSuccess={(message) => {
          onSuccess(message);
          onClose();
        }}
        onPendingChange={setIsPending}
      >
        {({ fields, actions }) => (
          <>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent dividers>{fields}</DialogContent>
            <DialogActions>{actions}</DialogActions>
          </>
        )}
      </TemplateForm>
    </Dialog>
  );
}
