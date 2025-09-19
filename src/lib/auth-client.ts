"use client";

import type { SignInOptions, SignInResponse, SignOutParams } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";

export async function login(
  provider: Parameters<typeof signIn>[0] = "google",
  options?: SignInOptions,
) {
  return signIn(provider, options) as Promise<SignInResponse | undefined>;
}

export async function logout(options?: SignOutParams<false>) {
  return signOut(options);
}
