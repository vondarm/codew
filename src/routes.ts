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
  workspaceRooms(workspaceId: string) {
    return `/workspaces/${workspaceId}/rooms`;
  },
  workspaceTemplates(workspaceSlug: string) {
    return `/workspaces/${workspaceSlug}/templates`;
  },
  room(slug: string) {
    return `/rooms/${slug}`;
  },
  signin({ callbackUrl }: SignInRouteParams) {
    return `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  },
} as const;
