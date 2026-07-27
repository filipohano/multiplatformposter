import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/platforms";

export async function publishPost(postId: string): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: { targets: { include: { socialAccount: true } } },
  });

  const mediaUrls = JSON.parse(post.mediaUrls) as string[];

  await prisma.post.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

  let anySucceeded = false;
  let anyFailed = false;

  for (const target of post.targets) {
    if (target.status === "PUBLISHED") {
      anySucceeded = true;
      continue;
    }

    await prisma.postTarget.update({ where: { id: target.id }, data: { status: "PUBLISHING" } });

    try {
      const adapter = getAdapter(target.platform);
      const result = await adapter.publishPost(
        {
          accessToken: target.socialAccount.accessToken,
          refreshToken: target.socialAccount.refreshToken,
          externalId: target.socialAccount.externalId,
          metadata: target.socialAccount.metadata ? JSON.parse(target.socialAccount.metadata) : null,
        },
        { caption: post.caption, mediaUrls }
      );

      await prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: "PUBLISHED",
          externalPostId: result.externalPostId,
          publishedAt: new Date(),
          errorMessage: null,
        },
      });
      anySucceeded = true;
    } catch (error) {
      anyFailed = true;
      await prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Ukjent feil",
        },
      });
    }
  }

  const finalStatus = anyFailed ? (anySucceeded ? "PARTIAL" : "FAILED") : "PUBLISHED";

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: finalStatus,
      publishedAt: finalStatus === "PUBLISHED" || finalStatus === "PARTIAL" ? new Date() : null,
    },
  });
}

export async function publishDuePosts(): Promise<{ processed: number }> {
  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true },
  });

  for (const post of due) {
    await publishPost(post.id);
  }

  return { processed: due.length };
}
