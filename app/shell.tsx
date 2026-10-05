"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth-actions";
import type { Role } from "@/lib/roles";

const drawerGroups = [
  {
    title: "עבודה",
    links: [
      { href: "/today", label: "היום" },
      { href: "/orders", label: "הזמנות" },
      { href: "/board", label: "לוח" },
      { href: "/expected", label: "מה צפוי" },
      { href: "/morning", label: "משוב בוקר" },
    ],
  },
  {
    title: "עסק",
    links: [
      { href: "/customers", label: "לקוחות" },
      { href: "/products", label: "מוצרים" },
      { href: "/dishes", label: "מנות" },
      { href: "/money", label: "כסף" },
    ],
  },
  {
    title: "חיבורים",
    links: [
      { href: "/grok", label: "Grok" },
      { href: "/connections", label: "שופיפיי וסטרייפ" },
    ],
  },
  {
    title: "ניהול",
    links: [
      { href: "/users", label: "משתמשים" },
      { href: "/account", label: "חשבון" },
    ],
  },
];

function groupsFor(role: Role) {
  const allowed =
    role === "kitchen"
      ? new Set(["/today", "/account"])
      : role === "accounts"
        ? new Set(["/money", "/account"])
        : role === "integrations"
          ? new Set(["/connections", "/account"])
          : null;

  return drawerGroups
    .map((group) => ({
      ...group,
      links: allowed ? group.links.filter((link) => allowed.has(link.href)) : group.links,
    }))
    .filter((group) => group.links.length > 0);
}

export function Work({
  title,
  backHref,
  role,
  children,
}: {
  title: string;
  backHref?: string;
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = groupsFor(role);

  return (
    <main className="min-h-dvh bg-paper pb-32">
      <header className="app-header sticky top-0 z-20 grid h-[4.75rem] grid-cols-[1fr_auto_1fr] items-center bg-[#111111] px-4 text-white">
        <div className="flex justify-start">
          {backHref ? (
            <a href={backHref} className="min-h-11 rounded-full px-3 text-sm font-extrabold leading-[2.75rem] text-white">
              חזרה
            </a>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-full px-3 text-sm font-extrabold text-white"
              onClick={() => setOpen(true)}
            >
              תפריט
            </button>
          )}
        </div>
        <img src="/brand/duba-logo.png" alt="duba" className="h-12 w-auto" />
        <div className="flex justify-end">
          <form action={logout}>
            <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-bold text-white/80">
              יציאה
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {children}
      </div>
      <nav className="app-nav no-print">
        {role === "owner" ? (
          <OwnerDock pathname={pathname} />
        ) : (
          <SimpleDock
            pathname={pathname}
            links={
              role === "kitchen"
                ? [
                    { href: "/today", label: "היום" },
                    { href: "/account", label: "חשבון" },
                  ]
                : role === "accounts"
                  ? [
                      { href: "/money", label: "כסף" },
                      { href: "/account", label: "חשבון" },
                    ]
                  : [
                      { href: "/connections", label: "חיבורים" },
                      { href: "/account", label: "חשבון" },
                    ]
            }
          />
        )}
      </nav>
      {open ? (
        <button
          type="button"
          className="drawer-backdrop no-print"
          aria-label="סגירת תפריט"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={`drawer no-print flex flex-col overflow-hidden ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-base font-extrabold">תפריט</p>
          <button type="button" className="min-h-11 rounded-full px-3 text-sm font-bold" onClick={() => setOpen(false)}>
            סגירה
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8">
          {groups.map((group) => (
            <section key={group.title}>
              <p className="px-1 pb-2 text-xs font-bold tracking-wide text-white/45">{group.title}</p>
              <ul className="overflow-hidden rounded-2xl bg-white/10">
                {group.links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <li key={link.href} className="border-b border-white/10 last:border-b-0">
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-12 items-center px-4 text-[15px] font-bold ${
                          active ? "bg-white text-[#111111]" : "text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </main>
  );
}

function OwnerDock({ pathname }: { pathname: string }) {
  return (
    <div className="relative mx-auto flex h-[4.75rem] max-w-md items-end justify-between gap-1 px-3 pb-2">
      <DockTab href="/" label="דשבורד" pathname={pathname} icon="home" />
      <DockTab href="/today" label="היום" pathname={pathname} icon="sun" />
      <div className="w-16 shrink-0" />
      <DockTab href="/orders" label="הזמנות" pathname={pathname} icon="list" />
      <DockTab href="/customers" label="לקוחות" pathname={pathname} icon="people" />
      <Link
        href="/orders/new"
        className="absolute left-1/2 top-0 flex h-[4.25rem] w-[4.25rem] -translate-x-1/2 -translate-y-5 flex-col items-center justify-center rounded-full bg-white text-[#111111] shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
      >
        <span className="text-3xl leading-none font-bold">+</span>
        <span className="text-[11px] font-extrabold">חדשה</span>
      </Link>
    </div>
  );
}

function SimpleDock({
  pathname,
  links,
}: {
  pathname: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto flex h-16 max-w-md items-center gap-2 px-3">
      {links.map((link) => (
        <DockTab key={link.href} href={link.href} label={link.label} pathname={pathname} icon="home" />
      ))}
    </div>
  );
}

function DockTab({
  href,
  label,
  pathname,
  icon,
}: {
  href: string;
  label: string;
  pathname: string;
  icon: "home" | "sun" | "list" | "people";
}) {
  const active =
    href === "/"
      ? pathname === "/"
      : href === "/orders"
        ? pathname === "/orders" ||
          (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/new"))
        : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-extrabold ${
        active ? "bg-white text-[#111111]" : "text-white/75"
      }`}
    >
      <DockIcon name={icon} />
      {label}
    </Link>
  );
}

function DockIcon({ name }: { name: "home" | "sun" | "list" | "people" }) {
  const common = "h-[18px] w-[18px]";
  if (name === "sun") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    );
  }
  if (name === "people") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
