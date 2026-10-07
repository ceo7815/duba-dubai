import type { Metadata } from "next";
import Link from "next/link";
import { Assistant } from "next/font/google";
import { catalog } from "@/lib/store/catalog";
import { collectionLabels } from "@/lib/store/i18n";
import { getDict } from "@/lib/store/lang";
import { CartLink, LangToggle } from "./header-tools";

const assistant = Assistant({ subsets: ["latin", "hebrew"], weight: ["400", "600", "700"] });

const shopDescription =
  "Kosher home-style food in Dubai – Shabbat meal packages, catering for events and daily delivery. Order online. | אוכל כשר ביתי בדובאי – ארוחות שבת, קייטרינג ומשלוחים.";

export const metadata: Metadata = {
  title: { default: "Duba Dubai · Kosher Food & Catering", template: "%s · Duba Dubai" },
  description: shopDescription,
  openGraph: {
    type: "website",
    siteName: "Duba Dubai",
    locale: "en_US",
    alternateLocale: "he_IL",
    title: "Duba Dubai · Kosher Food & Catering",
    description: shopDescription,
    url: "/",
  },
  appleWebApp: { title: "Duba Dubai" },
};

const menu = ["main-courses", "side-dishes", "starters", "sandwiches", "combos", "desserts", "soft-drinks", "specials"];

const policyHe: Record<string, string> = {
  "privacy-policy": "מדיניות פרטיות",
  "refund-policy": "מדיניות ביטולים והחזרים",
  "shipping-policy": "מדיניות משלוחים",
  "terms-of-service": "תנאי שימוש",
};

export default async function ShopLayout({ children }: LayoutProps<"/shop">) {
  const { lang, t } = await getDict();
  const links = [
    { href: "/shop/collections/shabbat-meal-packages", label: t.shabbat },
    { href: "/shop/pages/about-us", label: t.about },
    { href: "/shop/pages/kosher-certificate", label: t.kosher },
    { href: "/shop/pages/contact-1", label: t.contact },
  ];
  const label = (handle: string) => collectionLabels[handle]?.[lang] ?? handle;

  return (
    <div
      dir={lang === "he" ? "rtl" : "ltr"}
      lang={lang}
      className={`${assistant.className} min-h-dvh bg-black text-white`}
    >
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#121212]">
        <div className="relative mx-auto grid h-16 max-w-[120rem] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:flex md:h-[89px] md:gap-3 md:px-12">
          <details className="justify-self-start md:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center" aria-label={t.menu}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </summary>
            <nav className="absolute inset-x-0 top-16 max-h-[80dvh] overflow-y-auto border-b border-white/10 bg-[#121212] px-6 py-4 text-lg">
              <p className="py-2 text-white/60">{t.menu}</p>
              {menu.map((handle) => (
                <Link key={handle} href={`/shop/collections/${handle}`} className="block py-2 ps-4">
                  {label(handle)}
                </Link>
              ))}
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="block py-2">
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
          <Link href="/shop" className="justify-self-center">
            <img src="/brand/duba-logo.png" alt="Duba" className="h-8 w-auto md:h-11" />
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-7 text-[15px] text-white/80 md:flex">
            <div className="group relative">
              <Link href="/shop/collections/all" className="block py-6 hover:text-white">
                {t.menu} ▾
              </Link>
              <div className="invisible absolute start-0 top-full min-w-56 border border-white/10 bg-[#121212] py-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
                {menu.map((handle) => (
                  <Link key={handle} href={`/shop/collections/${handle}`} className="block px-5 py-2 hover:underline">
                    {label(handle)}
                  </Link>
                ))}
              </div>
            </div>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 justify-self-end md:ms-auto md:gap-1.5">
            <LangToggle lang={lang} />
            <CartLink label={t.cart} />
          </div>
        </div>
      </div>
      {children}
      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto grid max-w-[120rem] gap-10 px-5 py-14 sm:grid-cols-2 md:px-12 lg:grid-cols-4">
          <FooterList title={t.knowUs} items={[{ href: "/shop/collections/all", label: t.menu }, ...links]} />
          <FooterList
            title={t.policies}
            items={Object.entries(catalog.policies).map(([handle, policy]) => ({
              href: `/shop/policies/${handle}`,
              label: lang === "he" ? policyHe[handle] : policy.title.replace(/\b\w/g, (letter) => letter.toUpperCase()),
            }))}
          />
          <FooterList
            title={t.contact}
            items={[
              { href: "/shop/pages/contact-1", label: t.getInTouch },
              { href: "https://wa.me/971559060717", label: "WhatsApp: +971559060717" },
              { href: "mailto:office@dubacatering.com", label: "office@dubacatering.com" },
            ]}
          />
          <div>
            <h4 className="text-lg font-semibold">{t.payments}</h4>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold" dir="ltr">
              {["VISA", "Mastercard", "AMEX", "Apple Pay", "Google Pay"].map((method) => (
                <span key={method} className="rounded bg-white px-2 py-1 text-black">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()}, Duba Kosher
        </p>
      </footer>
    </div>
  );
}

function FooterList({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2 text-white/75">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-white hover:underline" dir="auto">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
