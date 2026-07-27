import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import DisconnectAccountButton from "@/components/DisconnectAccountButton";

const PLATFORM_INFO: Record<string, { label: string; color: string }> = {
  TWITTER: { label: "X (Twitter)", color: "bg-slate-900" },
  INSTAGRAM: { label: "Instagram", color: "bg-pink-600" },
  TIKTOK: { label: "TikTok", color: "bg-black" },
};

const ALL_PLATFORMS = ["TWITTER", "INSTAGRAM", "TIKTOK"] as const;

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const userId = await requireUserId();
  const { connected, error } = await searchParams;

  const accounts = await prisma.socialAccount.findMany({ where: { userId } });
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Kontoer</h1>
        <p className="text-slate-600">Koble til Instagram, X (Twitter) og TikTok for å kunne publisere.</p>
      </div>

      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {PLATFORM_INFO[connected]?.label ?? connected} ble koblet til!
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Tilkoblede kontoer</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">Ingen kontoer tilkoblet ennå.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-8 w-8 rounded-full ${PLATFORM_INFO[account.platform].color}`}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">{account.displayName}</p>
                    <p className="text-xs text-slate-500">{PLATFORM_INFO[account.platform].label}</p>
                  </div>
                </div>
                <DisconnectAccountButton accountId={account.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Koble til en ny konto</h2>
        <div className="flex flex-wrap gap-3">
          {ALL_PLATFORMS.map((platform) => (
            <a key={platform} href={`/api/accounts/${platform.toLowerCase()}/connect`} className="btn-primary">
              Koble til {PLATFORM_INFO[platform].label}
              {connectedPlatforms.has(platform) ? " (legg til flere)" : ""}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
