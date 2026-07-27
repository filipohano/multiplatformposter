"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DisconnectAccountButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Koble fra denne kontoen?")) return;
    setLoading(true);
    const res = await fetch(`/api/social-accounts/${accountId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
    else alert("Kunne ikke koble fra kontoen.");
  }

  return (
    <button className="btn-danger" onClick={handleClick} disabled={loading}>
      {loading ? "Kobler fra…" : "Koble fra"}
    </button>
  );
}
