import { useActionState, useState } from "react";

const withHandlers =
  <Args extends Array<unknown>, R>(action: (...args: Args) => Promise<R>) =>
  (onSuccess?: (data: R) => void) =>
  (...args: Args): Promise<R> => {
    return action(...args).then((data) => {
      onSuccess?.(data);
      return data;
    });
  };

export const useForm = <T extends object, ActionState extends object>(
  current: Partial<T> | null | undefined,
  action: (prevState: Awaited<ActionState>, data: FormData) => Promise<ActionState>,
  initialActionState: Awaited<ActionState>,
  onSuccess: (data: ActionState) => void,
  initialFormValue: T,
) => {
  const [localFormData, setLocalFormData] = useState<Partial<T>>({});
  const [state, formAction, isPending] = useActionState(
    withHandlers(action)((data) => {
      onSuccess(data);
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
