import type { TemplateField } from "@/lib/services/template";

export type TemplateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<TemplateField, string>>;
};

export const templateActionIdleState: TemplateActionState = { status: "idle" };
