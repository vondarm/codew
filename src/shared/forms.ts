import { useActionState, useState } from "react";

type HandlerOptions<R> = {
  onSuccess?: (data: R) => void;
  onError?: (data: R) => void;
};

type WithStatus = { status: "success" | "error" | "idle" };

export const withHandlers =
  <Args extends Array<unknown>, R extends WithStatus>(action: (...args: Args) => Promise<R>) =>
  (handlers?: HandlerOptions<R>) =>
  async (...args: Args): Promise<R> => {
    try {
      const data = await action(...args);
      if (data.status === "success") {
        handlers?.onSuccess?.(data);
      }
      if (data.status === "error") {
        handlers?.onError?.(data);
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

export const useForm = <T extends object, ActionState extends WithStatus>(
  current: Partial<T> | null | undefined,
  action: (prevState: Awaited<ActionState>, data: FormData) => Promise<ActionState>,
  initialActionState: Awaited<ActionState>,
  handlers: {
    onSuccess?: (data: ActionState) => void;
    onError?: (data: ActionState | null) => void;
  },
  initialFormValue: T,
) => {
  const [localFormData, setLocalFormData] = useState<Partial<T>>({});
  const [state, formAction, isPending] = useActionState(
    withHandlers(action)({
      onSuccess: (data) => {
        handlers.onSuccess?.(data);
        setLocalFormData({});
      },
      onError: (data) => {
        handlers.onError?.(data);
      },
    }),
    initialActionState,
  );

  const formValue: T = {
    ...initialFormValue,
    ...current,
    ...localFormData,
  };

  const set =
    <Key extends keyof T>(key: Key) =>
    (value: T[Key]) =>
      setLocalFormData((data) => ({
        ...data,
        [key]: value,
      }));

  return {
    formValue,
    reset: () => setLocalFormData({}),
    set,
    action: formAction,
    state,
    isPending,
  };
};
