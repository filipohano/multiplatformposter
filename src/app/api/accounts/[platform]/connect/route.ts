import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/platforms";
import { parsePlatform, baseUrl } from "@/lib/platformParam";
import { getCurrentUser } from "@/lib/session";
import { encodeOAuthState, createNonce } from "@/lib/oauthState";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl()));
  }

  const { platform: platformParam } = await params;
  const platform = parsePlatform(platformParam);
  if (!platform) {
    return NextResponse.json({ error: "Ukjent plattform" }, { status: 400 });
  }

  const redirectUri = `${baseUrl()}/api/accounts/${platform.toLowerCase()}/callback`;
  const nonce = createNonce();
  const adapter = getAdapter(platform);
  const { url, session } = adapter.getAuthorizationUrl(nonce, redirectUri);

  const state = encodeOAuthState({ userId: user.id, nonce, data: session });
  const finalUrl = new URL(url);
  finalUrl.searchParams.set("state", state);

  return NextResponse.redirect(finalUrl.toString());
}
