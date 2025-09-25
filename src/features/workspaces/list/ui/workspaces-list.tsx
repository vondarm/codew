"use client";

import { useTransition } from "react";
import { Container, Stack } from "@mui/material";

import { logout } from "@/lib/auth-client";
import { ROUTES } from "@/routes";

import { FeedbackSnackbar } from "../components/feedback-snackbar";
import {
  CreateWorkspaceDialog,
  DeleteWorkspaceDialog,
  EditWorkspaceDialog,
} from "../components/dialogs";
import { WorkspacesHeader } from "../components/workspaces-header";
import { WorkspacesTable } from "../components/workspaces-table";
import { UserCard } from "../components/user-card";
import { useWorkspaceDialogs } from "../hooks/use-workspace-dialogs";
import { useWorkspaceFeedback } from "../hooks/use-workspace-feedback";
import { useWorkspacesManager } from "../hooks/use-workspaces-manager";
import type { WorkspacesListProps } from "../types";

export function WorkspacesList({ workspaces, currentUser }: WorkspacesListProps) {
  const { sortedWorkspaces, formatWorkspaceDate, getRoleVisuals } =
    useWorkspacesManager(workspaces);
  const dialogs = useWorkspaceDialogs();
  const feedback = useWorkspaceFeedback();
  const [isLogoutPending, startLogout] = useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await logout({ callbackUrl: ROUTES.home });
    });
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <UserCard user={currentUser} onLogout={handleLogout} isLogoutPending={isLogoutPending} />
        <WorkspacesHeader onCreateClick={dialogs.create.open} />
        <WorkspacesTable
          workspaces={sortedWorkspaces}
          onCreateClick={dialogs.create.open}
          onEdit={dialogs.edit.open}
          onDelete={dialogs.delete.open}
          getRoleVisuals={getRoleVisuals}
          formatWorkspaceDate={formatWorkspaceDate}
        />
      </Stack>

      <CreateWorkspaceDialog
        key={dialogs.create.key}
        open={dialogs.create.isOpen}
        onClose={dialogs.create.close}
        onSuccess={feedback.showSuccess}
      />
      <EditWorkspaceDialog
        key={dialogs.edit.key}
        open={dialogs.edit.isOpen}
        onClose={dialogs.edit.close}
        onSuccess={feedback.showSuccess}
        workspace={dialogs.edit.workspace}
      />
      <DeleteWorkspaceDialog
        key={dialogs.delete.key}
        open={dialogs.delete.isOpen}
        onClose={dialogs.delete.close}
        onSuccess={feedback.showSuccess}
        workspace={dialogs.delete.workspace}
      />

      {feedback.feedback ? (
        <FeedbackSnackbar
          message={feedback.feedback.message}
          severity={feedback.feedback.severity}
          onClose={feedback.reset}
        />
      ) : null}
    </Container>
  );
}

export default WorkspacesList;
