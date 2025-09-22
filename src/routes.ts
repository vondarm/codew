export type SignInRouteParams = {
  callbackUrl: string;
};

export const ROUTES = {
  home: "/",
  workspaces: "/workspaces",
  apiHello: "/api/hello",
  workspace(workspaceId: string) {
    return `/workspaces/${workspaceId}`;
  },
  workspaceRooms(workspaceId: string) {
    return `/workspaces/${workspaceId}/rooms`;
  },
  workspaceTemplates(workspaceId: string) {
    return `/workspaces/${workspaceId}/templates`;
  },
  room(slug: string) {
    return `/rooms/${slug}`;
  },
  signin({ callbackUrl }: SignInRouteParams) {
    return `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  },
} as const;
