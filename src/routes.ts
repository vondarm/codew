export type SignInRouteParams = {
  callbackUrl: string;
};

export const ROUTES = {
  home: "/",
  workspaces: "/workspaces",
  apiHello: "/api/hello",
  workspace(workspaceSlug: string) {
    return `/workspaces/${workspaceSlug}`;
  },
  workspaceRooms(workspaceSlug: string) {
    return `/workspaces/${workspaceSlug}/rooms`;
  },
  workspaceTemplates(workspaceSlug: string) {
    return `/workspaces/${workspaceSlug}/templates`;
  },
  room(workspaceSlug: string, roomSlug: string) {
    return `/workspaces/${workspaceSlug}/rooms/${roomSlug}`;
  },
  signin({ callbackUrl }: SignInRouteParams) {
    return `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  },
} as const;
