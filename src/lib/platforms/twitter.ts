import { TwitterApi } from "twitter-api-v2";
import type {
  ConnectedAccountInfo,
  OAuthStartResult,
  PlatformAdapter,
  PublishAccount,
  PublishInput,
  PublishResult,
} from "./types";
import { PlatformError } from "./types";

const CLIENT_ID = process.env.TWITTER_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET ?? "";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"];

function client() {
  return new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
}

async function fetchMedia(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new PlatformError(`Kunne ikke hente medie fra ${url}`, "TWITTER");
  }
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

export const twitterAdapter: PlatformAdapter = {
  getAuthorizationUrl(state: string, redirectUri: string): OAuthStartResult {
    const { url, codeVerifier } = client().generateOAuth2AuthLink(redirectUri, {
      scope: SCOPES,
      state,
    });
    return { url, session: { codeVerifier } };
  },

  async handleCallback({ code, redirectUri, session }): Promise<ConnectedAccountInfo> {
    const codeVerifier = session.codeVerifier;
    if (!codeVerifier) {
      throw new PlatformError("Mangler PKCE code_verifier for Twitter OAuth.", "TWITTER");
    }

    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client().loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri,
    });

    const me = await loggedClient.v2.me({ "user.fields": ["profile_image_url"] });

    return {
      externalId: me.data.id,
      displayName: me.data.username ? `@${me.data.username}` : me.data.name,
      avatarUrl: me.data.profile_image_url,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
    };
  },

  async publishPost(account: PublishAccount, input: PublishInput): Promise<PublishResult> {
    const userClient = new TwitterApi(account.accessToken);

    const mediaIds: string[] = [];
    for (const url of input.mediaUrls.slice(0, 4)) {
      const { buffer, mimeType } = await fetchMedia(url);
      const mediaId = await userClient.v1.uploadMedia(buffer, { mimeType });
      mediaIds.push(mediaId);
    }

    const tweet = await userClient.v2.tweet({
      text: input.caption,
      ...(mediaIds.length > 0
        ? { media: { media_ids: mediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string] } }
        : {}),
    });

    return { externalPostId: tweet.data.id };
  },
};
