"use client";

import { useCallback, useMemo, useState } from "react";

import type { WorkspaceListItem } from "../types";

type DialogKeyState = {
  create: number;
  edit: number;
  delete: number;
};

export function useWorkspaceDialogs() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<WorkspaceListItem | null>(null);
  const [deleteWorkspace, setDeleteWorkspace] = useState<WorkspaceListItem | null>(null);
  const [keys, setKeys] = useState<DialogKeyState>({ create: 0, edit: 0, delete: 0 });

  const openCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setKeys((current) => ({ ...current, create: current.create + 1 }));
  }, []);

  const openEdit = useCallback((workspace: WorkspaceListItem) => {
    setEditWorkspace(workspace);
  }, []);

  const closeEdit = useCallback(() => {
    setEditWorkspace(null);
    setKeys((current) => ({ ...current, edit: current.edit + 1 }));
  }, []);

  const openDelete = useCallback((workspace: WorkspaceListItem) => {
    setDeleteWorkspace(workspace);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteWorkspace(null);
    setKeys((current) => ({ ...current, delete: current.delete + 1 }));
  }, []);

  return useMemo(
    () => ({
      create: {
        isOpen: createOpen,
        key: keys.create,
        open: openCreate,
        close: closeCreate,
      },
      edit: {
        workspace: editWorkspace,
        isOpen: Boolean(editWorkspace),
        key: `${keys.edit}-${editWorkspace?.id ?? "none"}`,
        open: openEdit,
        close: closeEdit,
      },
      delete: {
        workspace: deleteWorkspace,
        isOpen: Boolean(deleteWorkspace),
        key: `${keys.delete}-${deleteWorkspace?.id ?? "none"}`,
        open: openDelete,
        close: closeDelete,
      },
    }),
    [
      closeCreate,
      closeDelete,
      closeEdit,
      createOpen,
      deleteWorkspace,
      editWorkspace,
      keys.create,
      keys.delete,
      keys.edit,
      openCreate,
      openDelete,
      openEdit,
    ],
  );
}
