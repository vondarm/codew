export type RoomActionField = "name" | "code" | "slug";

export type RoomActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<RoomActionField, string>>;
  newSlug?: string;
};

export const roomActionIdleState: RoomActionState = { status: "idle" };
