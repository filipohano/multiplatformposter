import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me";

export interface OAuthPendingState {
  userId: string;
  nonce: string;
  data: Record<string, string>;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeOAuthState(state: OAuthPendingState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeOAuthState(token: string): OAuthPendingState | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthPendingState;
  } catch {
    return null;
  }
}

export function createNonce(): string {
  return randomBytes(16).toString("hex");
}
