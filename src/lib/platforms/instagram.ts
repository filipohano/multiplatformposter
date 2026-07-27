import type {
  ConnectedAccountInfo,
  OAuthStartResult,
  PlatformAdapter,
  PublishAccount,
  PublishInput,
  PublishResult,
} from "./types";
import { PlatformError } from "./types";

const APP_ID = process.env.INSTAGRAM_APP_ID ?? "";
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";
const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Instagram publishing goes through the Meta Graph API: a Facebook Page must be
// linked to an Instagram professional (business/creator) account.
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok) {
    throw new PlatformError(`Instagram Graph API-feil: ${json?.error?.message ?? res.statusText}`, "INSTAGRAM");
  }
  return json as T;
}

async function graphPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new PlatformError(`Instagram Graph API-feil: ${json?.error?.message ?? res.statusText}`, "INSTAGRAM");
  }
  return json as T;
}

async function waitUntilMediaReady(mediaId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await graphGet<{ status_code: string }>(`/${mediaId}`, {
      fields: "status_code",
      access_token: accessToken,
    });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new PlatformError("Instagram klarte ikke å behandle videoen.", "INSTAGRAM");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new PlatformError("Tidsavbrudd mens Instagram behandlet videoen.", "INSTAGRAM");
}

export const instagramAdapter: PlatformAdapter = {
  getAuthorizationUrl(state: string, redirectUri: string): OAuthStartResult {
    const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    return { url: url.toString(), session: {} };
  },

  async handleCallback({ code, redirectUri }): Promise<ConnectedAccountInfo> {
    const tokenRes = await graphGet<{ access_token: string; expires_in?: number }>(
      "/oauth/access_token",
      {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }
    );

    // Exchange for a long-lived user access token (~60 days).
    const longLived = await graphGet<{ access_token: string; expires_in?: number }>(
      "/oauth/access_token",
      {
        grant_type: "fb_exchange_token",
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: tokenRes.access_token,
      }
    );

    const pages = await graphGet<{ data: FacebookPage[] }>("/me/accounts", {
      access_token: longLived.access_token,
      fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
    });

    const pageWithIg = pages.data.find((p) => p.instagram_business_account);
    if (!pageWithIg?.instagram_business_account) {
      throw new PlatformError(
        "Fant ingen Facebook-side med en tilkoblet Instagram-forretningskonto. Koble Instagram-kontoen din til en Facebook-side først.",
        "INSTAGRAM"
      );
    }

    const igAccount = await graphGet<{ id: string; username: string; profile_picture_url?: string }>(
      `/${pageWithIg.instagram_business_account.id}`,
      { fields: "id,username,profile_picture_url", access_token: pageWithIg.access_token }
    );

    return {
      externalId: igAccount.id,
      displayName: `@${igAccount.username}`,
      avatarUrl: igAccount.profile_picture_url,
      accessToken: pageWithIg.access_token,
      tokenExpiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : undefined,
      metadata: { facebookPageId: pageWithIg.id, instagramBusinessAccountId: igAccount.id },
    };
  },

  async publishPost(account: PublishAccount, input: PublishInput): Promise<PublishResult> {
    const igUserId = account.externalId;
    const isVideo = /\.(mp4|mov)(\?.*)?$/i.test(input.mediaUrls[0] ?? "");

    if (input.mediaUrls.length === 0) {
      throw new PlatformError("Instagram krever minst ett bilde eller en video.", "INSTAGRAM");
    }

    let creationId: string;

    if (input.mediaUrls.length === 1) {
      const media = await graphPost<{ id: string }>(`/${igUserId}/media`, {
        access_token: account.accessToken,
        caption: input.caption,
        ...(isVideo
          ? { media_type: "REELS", video_url: input.mediaUrls[0] }
          : { image_url: input.mediaUrls[0] }),
      });
      if (isVideo) await waitUntilMediaReady(media.id, account.accessToken);
      creationId = media.id;
    } else {
      const children: string[] = [];
      for (const mediaUrl of input.mediaUrls.slice(0, 10)) {
        const isChildVideo = /\.(mp4|mov)(\?.*)?$/i.test(mediaUrl);
        const child = await graphPost<{ id: string }>(`/${igUserId}/media`, {
          access_token: account.accessToken,
          is_carousel_item: "true",
          ...(isChildVideo ? { media_type: "VIDEO", video_url: mediaUrl } : { image_url: mediaUrl }),
        });
        children.push(child.id);
      }
      const carousel = await graphPost<{ id: string }>(`/${igUserId}/media`, {
        access_token: account.accessToken,
        media_type: "CAROUSEL",
        caption: input.caption,
        children: children.join(","),
      });
      creationId = carousel.id;
    }

    const published = await graphPost<{ id: string }>(`/${igUserId}/media_publish`, {
      access_token: account.accessToken,
      creation_id: creationId,
    });

    return { externalPostId: published.id };
  },
};
