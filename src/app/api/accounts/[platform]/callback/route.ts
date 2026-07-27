import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/platforms";
import { parsePlatform, baseUrl } from "@/lib/platformParam";
import { decodeOAuthState } from "@/lib/oauthState";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;
  const platform = parsePlatform(platformParam);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const redirectToAccounts = (query: string) =>
    NextResponse.redirect(new URL(`/accounts?${query}`, baseUrl()));

  if (!platform) {
    return NextResponse.json({ error: "Ukjent plattform" }, { status: 400 });
  }
  if (oauthError) {
    return redirectToAccounts(`error=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !stateToken) {
    return redirectToAccounts("error=Mangler+code+eller+state");
  }

  const state = decodeOAuthState(stateToken);
  if (!state) {
    return redirectToAccounts("error=Ugyldig+state");
  }

  try {
    const redirectUri = `${baseUrl()}/api/accounts/${platform.toLowerCase()}/callback`;
    const adapter = getAdapter(platform);
    const account = await adapter.handleCallback({ code, redirectUri, session: state.data });

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_externalId: {
          userId: state.userId,
          platform,
          externalId: account.externalId,
        },
      },
      create: {
        userId: state.userId,
        platform,
        externalId: account.externalId,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiresAt: account.tokenExpiresAt,
        metadata: account.metadata ? JSON.stringify(account.metadata) : null,
      },
      update: {
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiresAt: account.tokenExpiresAt,
        metadata: account.metadata ? JSON.stringify(account.metadata) : null,
      },
    });

    return redirectToAccounts("connected=" + platform);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return redirectToAccounts(`error=${encodeURIComponent(message)}`);
  }
}
