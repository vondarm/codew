import Link from "next/link";

import { Container, Link as MuiLink, Paper, Stack, Typography } from "@mui/material";

import { ROUTES } from "@/routes";

import { SignInForm } from "./signin-form";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrlParam =
    typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : undefined;
  const callbackUrl =
    callbackUrlParam && callbackUrlParam.length > 0 ? callbackUrlParam : ROUTES.workspaces;

  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography component="h1" variant="h1">
            Вход в CodeW
          </Typography>
          <Typography color="text.secondary">
            Используйте корпоративный логин и пароль или выполните вход через Google.
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        >
          <SignInForm callbackUrl={callbackUrl} />
        </Paper>

        <Typography variant="body2" color="text.secondary">
          Вернуться на{" "}
          <MuiLink component={Link} href={ROUTES.home} underline="hover">
            главную страницу
          </MuiLink>
          .
        </Typography>
      </Stack>
    </Container>
  );
}
