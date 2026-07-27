"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Oversikt" },
  { href: "/posts", label: "Innlegg" },
  { href: "/posts/new", label: "Nytt innlegg" },
  { href: "/accounts", label: "Kontoer" },
];

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-brand-600">
            MultiPoster
          </Link>
          <nav className="hidden gap-4 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium ${
                  pathname === link.href ? "text-brand-600" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{session.user?.email}</span>
          <button className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Logg ut
          </button>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap text-sm font-medium ${
              pathname === link.href ? "text-brand-600" : "text-slate-500"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
