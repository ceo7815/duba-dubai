import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { fullAccess } from "@/lib/roles";

const groups = [
  {
    title: "עבודה",
    links: [
      { href: "/today", label: "היום" },
      { href: "/orders", label: "הזמנות" },
      { href: "/board", label: "לוח" },
    ],
  },
  {
    title: "עסק",
    links: [
      { href: "/menu", label: "תפריט" },
      { href: "/customers", label: "לקוחות" },
      { href: "/products", label: "מכירות לפי מוצר" },
    ],
  },
  {
    title: "כספים",
    links: [
      { href: "/money/income", label: "הכנסות" },
      { href: "/money/expenses", label: "הוצאות" },
      { href: "/money/reports", label: "דוחות" },
    ],
  },
  {
    title: "חיבורים",
    links: [
      { href: "/grok", label: "Grok" },
      { href: "/connections", label: "חנות וסטרייפ" },
    ],
  },
  {
    title: "ניהול",
    links: [{ href: "/users", label: "משתמשים" }],
  },
];

export default async function MorePage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

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
