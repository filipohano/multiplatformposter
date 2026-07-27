import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import PostComposer from "@/components/PostComposer";

export default async function NewPostPage() {
  const userId = await requireUserId();
  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
    select: { id: true, platform: true, displayName: true },
  });

  if (accounts.length === 0) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <h1 className="mb-2 text-xl font-semibold">Ingen kontoer tilkoblet</h1>
        <p className="mb-4 text-sm text-slate-600">
          Du må koble til minst én konto (Instagram, X/Twitter eller TikTok) før du kan lage et innlegg.
        </p>
        <Link href="/accounts" className="btn-primary">
          Koble til en konto
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nytt innlegg</h1>
      <PostComposer accounts={accounts} />
    </div>
  );
}
