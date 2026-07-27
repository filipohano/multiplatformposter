import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/scheduler";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "") ?? new URL(request.url).searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const result = await publishDuePosts();
  return NextResponse.json(result);
}
