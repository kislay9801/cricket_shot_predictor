"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Predict" },
  { href: "/history", label: "History" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-margin py-md">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary">sports_cricket</span>
          <span className="font-headline-md text-headline-md font-bold text-primary">
            Shot<span className="text-secondary">Sense</span>
          </span>
        </Link>

        <div className="hidden items-center gap-xl md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-body-md text-body-md transition-colors ${
                isActive(l.href)
                  ? "border-b-2 border-secondary pb-1 font-bold text-secondary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden"
        >
          <span className="material-symbols-outlined text-primary">{open ? "close" : "menu"}</span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-outline-variant bg-surface-container-lowest md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-margin py-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`py-md font-body-md text-body-md ${
                  isActive(l.href) ? "font-bold text-secondary" : "text-on-surface-variant"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
