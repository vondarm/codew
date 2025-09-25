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
  workspaceTemplates(workspaceSlug: string) {
    return `/workspaces/${workspaceSlug}/templates`;
  },
  signin({ callbackUrl }: SignInRouteParams) {
    return `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  },
} as const;
