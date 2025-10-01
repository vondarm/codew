"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";

import { Button, Divider, Stack, TextField, Typography } from "@mui/material";

import { login } from "@/lib/auth-client";
import { useNotification } from "@/app/notification-provider";

type SignInFormProps = {
  callbackUrl: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotification();

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);

      try {
        const response = await login("credentials", {
          redirect: false,
          login: loginValue,
          password,
          callbackUrl,
        });

        if (!response || response.error || response.ok === false) {
          notify({ severity: "error", message: "Неверный логин или пароль." });
          setIsSubmitting(false);
          return;
        }

        const destination = response.url ?? callbackUrl;
        router.push(destination);
        router.refresh();
      } catch (submitError) {
        console.error("Failed to sign in with credentials", submitError);
        notify({ severity: "error", message: "Не удалось выполнить вход. Попробуйте ещё раз." });
        setIsSubmitting(false);
      }
    },
    [callbackUrl, loginValue, notify, password, router],
  );

  const handleGoogleSignIn = useCallback(() => {
    void login("google", { callbackUrl });
  }, [callbackUrl]);

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3} noValidate>
      <Stack spacing={1}>
        <Typography variant="h2" component="h2">
          Вход по логину и паролю
        </Typography>
        <Typography color="text.secondary">
          Укажите учётные данные, выданные вашей командой.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <TextField
          label="Логин"
          name="login"
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
          type="text"
          autoComplete="username"
          fullWidth
          required
          disabled={isSubmitting}
        />
        <TextField
          label="Пароль"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          fullWidth
          required
          disabled={isSubmitting}
        />
      </Stack>

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? "Входим..." : "Войти"}
      </Button>

      <Divider>или</Divider>

      <Button variant="outlined" size="large" onClick={handleGoogleSignIn} disabled={isSubmitting}>
        Войти через Google
      </Button>
    </Stack>
  );
}
