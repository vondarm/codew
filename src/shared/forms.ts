import { useActionState, useState } from "react";

const withHandlers =
  <Args extends Array<unknown>, R>(action: (...args: Args) => Promise<R>) =>
  (onSuccess?: () => void) =>
  (...args: Args): Promise<R> => {
    return action(...args).then((data) => {
      onSuccess?.();
      return data;
    });
  };

export const useForm = <T extends object, ActionState extends object>(
  current: Partial<T> | null | undefined,
  action: (prevState: Awaited<ActionState>, data: FormData) => Promise<ActionState>,
  initialActionState: Awaited<ActionState>,
  onSuccess: () => void,
  initialFormValue: T,
) => {
  const [localFormData, setLocalFormData] = useState<Partial<T>>({});
  const [state, formAction, isPending] = useActionState(
    withHandlers(action)(() => {
      onSuccess();
      setLocalFormData({});
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
