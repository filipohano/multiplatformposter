"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Account {
  id: string;
  platform: "TWITTER" | "INSTAGRAM" | "TIKTOK";
  displayName: string;
}

const PLATFORM_LABELS: Record<Account["platform"], string> = {
  TWITTER: "X (Twitter)",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

interface UploadedMedia {
  url: string;
  name: string;
}

export default function PostComposer({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Opplasting feilet.");
        continue;
      }
      const json = await res.json();
      setMedia((prev) => [...prev, { url: json.url, name: file.name }]);
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedAccountIds.length === 0) {
      setError("Velg minst én konto å publisere til.");
      return;
    }
    if (scheduleEnabled && !scheduledAt) {
      setError("Velg et tidspunkt for planlegging, eller skru av planlegging.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        mediaUrls: media.map((m) => m.url),
        socialAccountIds: selectedAccountIds,
        scheduledAt: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Kunne ikke lagre innlegget.");
      return;
    }

    router.push("/posts");
    router.refresh();
  }

  const minDateTimeLocal = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-6">
      <div>
        <label className="label" htmlFor="caption">Bildetekst</label>
        <textarea
          id="caption"
          className="input min-h-[120px]"
          placeholder="Skriv bildeteksten din…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={5000}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{caption.length}/5000</p>
      </div>

      <div>
        <label className="label">Bilder / video</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
        {uploading && <p className="mt-1 text-xs text-slate-500">Laster opp…</p>}
        {media.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {media.map((m) => (
              <li key={m.url} className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs">
                <span className="max-w-[140px] truncate">{m.name}</span>
                <button type="button" onClick={() => removeMedia(m.url)} className="text-red-500">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label">Publiser til</label>
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <label key={account.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedAccountIds.includes(account.id)}
                onChange={() => toggleAccount(account.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span className="font-medium">{PLATFORM_LABELS[account.platform]}</span>
              <span className="text-slate-500">{account.displayName}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Planlegg for senere
        </label>
        {scheduleEnabled && (
          <input
            type="datetime-local"
            className="input mt-2"
            min={minDateTimeLocal}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting || uploading}>
        {submitting ? "Lagrer…" : scheduleEnabled ? "Planlegg innlegg" : "Publiser nå"}
      </button>
    </form>
  );
}
