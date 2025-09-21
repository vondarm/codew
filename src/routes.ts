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
  signin({ callbackUrl }: SignInRouteParams) {
    return `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  },
} as const;
