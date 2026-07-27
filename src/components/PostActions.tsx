"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PostActions({ postId, status }: { postId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"delete" | "publish" | null>(null);

  async function handleDelete() {
    if (!confirm("Slette dette innlegget?")) return;
    setLoading("delete");
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    setLoading(null);
    if (res.ok) router.refresh();
    else alert("Kunne ikke slette innlegget.");
  }

  async function handlePublishNow() {
    setLoading("publish");
    const res = await fetch(`/api/posts/${postId}`, { method: "POST" });
    setLoading(null);
    if (res.ok) router.refresh();
    else alert("Kunne ikke publisere innlegget.");
  }

  const canDelete = status !== "PUBLISHING";
  const canPublishNow = status === "SCHEDULED" || status === "FAILED" || status === "DRAFT";

  return (
    <div className="flex gap-2">
      {canPublishNow && (
        <button className="btn-secondary" onClick={handlePublishNow} disabled={loading !== null}>
          {loading === "publish" ? "Publiserer…" : "Publiser nå"}
        </button>
      )}
      {canDelete && (
        <button className="btn-danger" onClick={handleDelete} disabled={loading !== null}>
          {loading === "delete" ? "Sletter…" : "Slett"}
        </button>
      )}
    </div>
  );
}
