import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [accountsCount, scheduledCount, publishedCount, recentPosts] = await Promise.all([
    prisma.socialAccount.count({ where: { userId } }),
    prisma.post.count({ where: { userId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { userId, status: { in: ["PUBLISHED", "PARTIAL"] } } }),
    prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { targets: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Oversikt</h1>
        <p className="text-slate-600">Velkommen tilbake! Her er status på kontoene og innleggene dine.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Tilkoblede kontoer</p>
          <p className="mt-1 text-3xl font-semibold">{accountsCount}</p>
          <Link href="/accounts" className="mt-2 inline-block text-sm text-brand-600">
            Administrer kontoer →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Planlagte innlegg</p>
          <p className="mt-1 text-3xl font-semibold">{scheduledCount}</p>
          <Link href="/posts" className="mt-2 inline-block text-sm text-brand-600">
            Se innlegg →
          </Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Publiserte innlegg</p>
          <p className="mt-1 text-3xl font-semibold">{publishedCount}</p>
          <Link href="/posts/new" className="mt-2 inline-block text-sm text-brand-600">
            Lag nytt innlegg →
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Siste innlegg</h2>
          <Link href="/posts" className="text-sm text-brand-600">
            Se alle
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-slate-500">Du har ikke laget noen innlegg ennå.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{post.caption || "(uten bildetekst)"}</p>
                  <p className="text-xs text-slate-500">
                    {post.targets.length} plattform(er) · {post.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
