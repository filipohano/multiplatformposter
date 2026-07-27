export type PlatformName = "TWITTER" | "INSTAGRAM" | "TIKTOK";

export interface OAuthStartResult {
  url: string;
  /** Anything that needs to survive until the callback (PKCE verifier, nonce, ...) */
  session: Record<string, string>;
}

export interface ConnectedAccountInfo {
  externalId: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PublishInput {
  caption: string;
  /** Publicly reachable URLs (the app's own /uploads are served over the public base URL). */
  mediaUrls: string[];
}

export interface PublishAccount {
  accessToken: string;
  refreshToken?: string | null;
  externalId: string;
  metadata?: Record<string, unknown> | null;
}

export interface PublishResult {
  externalPostId: string;
}

export interface PlatformAdapter {
  getAuthorizationUrl(state: string, redirectUri: string): OAuthStartResult;
  handleCallback(params: {
    code: string;
    redirectUri: string;
    session: Record<string, string>;
  }): Promise<ConnectedAccountInfo>;
  publishPost(account: PublishAccount, input: PublishInput): Promise<PublishResult>;
}

export class PlatformError extends Error {
  constructor(message: string, public readonly platform: PlatformName) {
    super(message);
    this.name = "PlatformError";
  }
}
