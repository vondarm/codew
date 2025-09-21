"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

const featureHighlights = [
  {
    title: "Next.js 15",
    description: "App Router, React 19, and Turbopack ready for a fast developer workflow.",
    color: "primary" as const,
  },
  {
    title: "Prisma ORM",
    description: "Type-safe database client configured for PostgreSQL development.",
    color: "secondary" as const,
  },
  {
    title: "MUI Design System",
    description: "Customizable theme foundation with responsive Material UI components.",
    color: "default" as const,
  },
];

export default function HomePage() {
  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={8}>
        <Box textAlign="center">
          <Chip label="Get started quickly" color="primary" sx={{ fontWeight: 600, mb: 2 }} />
          <Typography component="h1" variant="h1" gutterBottom>
            Modern workspace foundation
          </Typography>
          <Typography color="text.secondary" maxWidth={{ md: "60%" }} mx="auto">
            This starter kit ships with opinionated tooling so you can focus on building features:
            linting and formatting, database access with Prisma, and a Material UI theme ready for
            customization.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mt={4}>
            <Button component={Link} href="/api/hello" variant="contained" size="large">
              Explore API route
            </Button>
            <Button
              component={Link}
              href="https://mui.com/material-ui/getting-started/overview/"
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              size="large"
            >
              Read MUI docs
            </Button>
          </Stack>
        </Box>

        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="h2" gutterBottom>
              What&apos;s inside
            </Typography>
            <Typography color="text.secondary" mb={3}>
              A curated set of technologies with sensible defaults configured for team collaboration
              and productivity.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              flexWrap="wrap"
              useFlexGap
              alignItems="stretch"
            >
              {featureHighlights.map((feature) => (
                <Box
                  key={feature.title}
                  sx={{ flex: "1 1 240px", minWidth: { xs: "100%", sm: "240px" } }}
                >
                  <Stack spacing={1.5} height="100%">
                    <Chip
                      label={feature.title}
                      color={feature.color}
                      sx={{ alignSelf: "flex-start", fontWeight: 600 }}
                    />
                    <Typography color="text.secondary">{feature.description}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 4 }} />
            <Typography variant="body2" color="text.secondary">
              Update the theme in <code>src/theme/index.ts</code> to match your brand and iterate
              quickly with hot reloading powered by Next.js.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
