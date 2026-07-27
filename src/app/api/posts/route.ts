import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { publishPost } from "@/lib/scheduler";

const createPostSchema = z.object({
  caption: z.string().max(5000).default(""),
  mediaUrls: z.array(z.string()).default([]),
  socialAccountIds: z.array(z.string()).min(1, "Velg minst én konto å publisere til"),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    include: { targets: { include: { socialAccount: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { caption, mediaUrls, socialAccountIds, scheduledAt } = parsed.data;

  const accounts = await prisma.socialAccount.findMany({
    where: { id: { in: socialAccountIds }, userId: user.id },
  });
  if (accounts.length !== socialAccountIds.length) {
    return NextResponse.json({ error: "En eller flere kontoer ble ikke funnet" }, { status: 400 });
  }

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isImmediate = !scheduledDate || scheduledDate.getTime() <= Date.now();

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      caption,
      mediaUrls: JSON.stringify(mediaUrls),
      status: isImmediate ? "PUBLISHING" : "SCHEDULED",
      scheduledAt: scheduledDate,
      targets: {
        create: accounts.map((account) => ({
          socialAccountId: account.id,
          platform: account.platform,
        })),
      },
    },
  });

  if (isImmediate) {
    publishPost(post.id).catch((error) => {
      console.error(`Kunne ikke publisere post ${post.id}:`, error);
    });
  }

  return NextResponse.json({ post }, { status: 201 });
}
