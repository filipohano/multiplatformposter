import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">MultiPoster</h1>
        <p className="mt-3 max-w-xl text-lg text-slate-600">
          Skriv én bildetekst, velg mediet, og publiser eller planlegg innlegget til Instagram,
          X (Twitter) og TikTok samtidig — fra nettleseren eller som en app på iPhonen din.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/register" className="btn-primary">
          Kom i gang
        </Link>
        <Link href="/login" className="btn-secondary">
          Logg inn
        </Link>
      </div>
    </div>
  );
}
