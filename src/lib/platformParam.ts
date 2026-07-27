import type { Platform } from "@prisma/client";

const VALID_PLATFORMS: Platform[] = ["TWITTER", "INSTAGRAM", "TIKTOK"];

export function parsePlatform(value: string): Platform | null {
  const upper = value.toUpperCase();
  return (VALID_PLATFORMS as string[]).includes(upper) ? (upper as Platform) : null;
}

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}
