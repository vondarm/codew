import type { MemberField } from "@/lib/services/member";

export type MembersActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<MemberField, string>>;
};
const idleState: MembersActionState = { status: "idle" };

export { idleState as memberActionIdleState };
