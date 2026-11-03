"use client";

import { signOut } from "next-auth/react";

export async function signOutToLogin(): Promise<void> {
  try {
    await signOut({ redirect: false, callbackUrl: "/login" });
  } finally {
    window.location.assign("/login");
  }
}
