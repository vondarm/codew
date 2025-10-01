import { useActionState, useState } from "react";

type HandlerOptions<R> = {
  onSuccess?: (data: R) => void;
  onError?: (data: R | null, error?: unknown) => void;
};

const withHandlers =
  <Args extends Array<unknown>, R>(action: (...args: Args) => Promise<R>) =>
  (handlers?: HandlerOptions<R>) =>
  async (...args: Args): Promise<R> => {
    try {
      const data = await action(...args);
      handlers?.onSuccess?.(data);
      return data;
    } catch (error) {
      handlers?.onError?.(null, error);
      throw error;
    }
  };

export const useForm = <T extends object, ActionState extends object>(
  current: Partial<T> | null | undefined,
  action: (prevState: Awaited<ActionState>, data: FormData) => Promise<ActionState>,
  initialActionState: Awaited<ActionState>,
  handlers: {
    onSuccess?: (data: ActionState) => void;
    onError?: (data: ActionState | null, error?: unknown) => void;
  },
  initialFormValue: T,
) => {
  const [localFormData, setLocalFormData] = useState<Partial<T>>({});
  const [state, formAction, isPending] = useActionState(
    withHandlers(action)({
      onSuccess: (data) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "status" in data &&
          (data as { status?: string }).status === "error"
        ) {
          handlers.onError?.(data);
          return;
        }

        handlers.onSuccess?.(data);
        setLocalFormData({});
      },
      onError: (data, error) => {
        handlers.onError?.(data, error);
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
