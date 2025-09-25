"use client";

import { Box, Button, Stack, Typography } from "@mui/material";

type WorkspacesHeaderProps = {
  onCreateClick: () => void;
};

export function WorkspacesHeader({ onCreateClick }: WorkspacesHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
    >
      <Box>
        <Typography component="h1" variant="h1" gutterBottom>
          Рабочие области
        </Typography>
        <Typography color="text.secondary">
          Управляйте пространствами команды, создавайте новые и настраивайте slug для URL.
        </Typography>
      </Box>
      <Button variant="contained" onClick={onCreateClick}>
        Создать область
      </Button>
    </Stack>
  );
}
