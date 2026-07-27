import { randomBytes } from "crypto";
import type {
  ConnectedAccountInfo,
  OAuthStartResult,
  PlatformAdapter,
  PublishAccount,
  PublishInput,
  PublishResult,
} from "./types";
import { PlatformError } from "./types";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY ?? "";
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET ?? "";
const SCOPES = ["user.info.basic", "video.publish"];

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  error?: string;
  error_description?: string;
}

export const tiktokAdapter: PlatformAdapter = {
  getAuthorizationUrl(state: string, redirectUri: string): OAuthStartResult {
    const codeVerifier = randomBytes(32).toString("hex");
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", CLIENT_KEY);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return { url: url.toString(), session: { codeVerifier } };
  },

  async handleCallback({ code, redirectUri }): Promise<ConnectedAccountInfo> {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });
    const token = (await res.json()) as TikTokTokenResponse;
    if (!res.ok || token.error) {
      throw new PlatformError(`TikTok OAuth-feil: ${token.error_description ?? res.statusText}`, "TIKTOK");
    }

    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const userJson = await userRes.json();
    const info = userJson?.data?.user ?? {};

    return {
      externalId: token.open_id,
      displayName: info.display_name ?? token.open_id,
      avatarUrl: info.avatar_url,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    };
  },

  async publishPost(account: PublishAccount, input: PublishInput): Promise<PublishResult> {
    const videoUrl = input.mediaUrls.find((url) => /\.(mp4|mov|webm)(\?.*)?$/i.test(url));
    if (!videoUrl) {
      throw new PlatformError("TikTok krever en video for å publisere et innlegg.", "TIKTOK");
    }

    // Direct Post via PULL_FROM_URL requires the source domain to be verified
    // in the TikTok Developer Portal for the app.
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: input.caption,
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || json?.error?.code !== "ok") {
      throw new PlatformError(
        `TikTok publisering feilet: ${json?.error?.message ?? res.statusText}`,
        "TIKTOK"
      );
    }

    return { externalPostId: json.data.publish_id };
  },
};
