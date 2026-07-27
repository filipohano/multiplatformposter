import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { id } = await params;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account || account.userId !== user.id) {
    return NextResponse.json({ error: "Fant ikke kontoen" }, { status: 404 });
  }

  await prisma.socialAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
