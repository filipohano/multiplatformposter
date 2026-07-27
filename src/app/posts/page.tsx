import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import PostActions from "@/components/PostActions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHING: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast",
  SCHEDULED: "Planlagt",
  PUBLISHING: "Publiserer",
  PUBLISHED: "Publisert",
  PARTIAL: "Delvis publisert",
  FAILED: "Feilet",
};

const PLATFORM_LABELS: Record<string, string> = {
  TWITTER: "X (Twitter)",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export default async function PostsPage() {
  const userId = await requireUserId();
  const posts = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { targets: { include: { socialAccount: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Innlegg</h1>
          <p className="text-slate-600">Alle innleggene dine — utkast, planlagte og publiserte.</p>
        </div>
        <Link href="/posts/new" className="btn-primary">
          Nytt innlegg
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card text-center text-slate-500">
          Ingen innlegg ennå.{" "}
          <Link href="/posts/new" className="text-brand-600">
            Lag ditt første innlegg
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => {
            const mediaUrls = JSON.parse(post.mediaUrls) as string[];
            return (
              <li key={post.id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`badge ${STATUS_STYLES[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                      {post.scheduledAt && (
                        <span className="text-xs text-slate-500">
                          {post.status === "SCHEDULED" ? "Planlagt til " : "Planlagt var "}
                          {new Date(post.scheduledAt).toLocaleString("no-NO")}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-800">
                      {post.caption || <em className="text-slate-400">(uten bildetekst)</em>}
                    </p>
                    {mediaUrls.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">{mediaUrls.length} vedlagt medie(r)</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.targets.map((target) => (
                        <span
                          key={target.id}
                          className="badge border border-slate-200 text-slate-600"
                          title={target.errorMessage ?? undefined}
                        >
                          {PLATFORM_LABELS[target.platform]} · {target.status}
                          {target.status === "FAILED" && target.errorMessage ? `: ${target.errorMessage}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <PostActions postId={post.id} status={post.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
