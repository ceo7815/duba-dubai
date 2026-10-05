import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";

const groups = [
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

export default async function MorePage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  return (
    <Work title="עוד" role={profile.role}>
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <p className="px-1 text-xs font-bold text-muted">{group.title}</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block border-b border-line px-4 py-3 text-base font-extrabold last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Work>
  );
}
