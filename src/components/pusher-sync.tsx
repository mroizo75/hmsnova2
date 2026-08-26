"use client";

import { usePusherChannel } from "@/hooks/usePusherChannel";

export function PusherSync() {
  usePusherChannel();
  return null;
}
