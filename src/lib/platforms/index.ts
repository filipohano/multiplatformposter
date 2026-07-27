import type { Platform } from "@prisma/client";
import type { PlatformAdapter } from "./types";
import { twitterAdapter } from "./twitter";
import { instagramAdapter } from "./instagram";
import { tiktokAdapter } from "./tiktok";

export const adapters: Record<Platform, PlatformAdapter> = {
  TWITTER: twitterAdapter,
  INSTAGRAM: instagramAdapter,
  TIKTOK: tiktokAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export * from "./types";
