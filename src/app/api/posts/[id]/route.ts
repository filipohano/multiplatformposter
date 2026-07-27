import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { publishPost } from "@/lib/scheduler";

async function loadOwnedPost(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== userId) return null;
  return post;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;
  const post = await loadOwnedPost(id, user.id);
  if (!post) return NextResponse.json({ error: "Fant ikke posten" }, { status: 404 });

  if (post.status === "PUBLISHING") {
    return NextResponse.json({ error: "Kan ikke slette en post som publiseres akkurat nå" }, { status: 409 });
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;
  const post = await loadOwnedPost(id, user.id);
  if (!post) return NextResponse.json({ error: "Fant ikke posten" }, { status: 404 });

  if (post.status !== "SCHEDULED" && post.status !== "FAILED" && post.status !== "DRAFT") {
    return NextResponse.json({ error: "Posten kan ikke publiseres nå" }, { status: 409 });
  }

  await publishPost(post.id);
  const updated = await prisma.post.findUnique({ where: { id } });
  return NextResponse.json({ post: updated });
}
