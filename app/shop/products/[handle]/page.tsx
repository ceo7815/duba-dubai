import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, isPackage, soldOut } from "@/lib/store/catalog";
import { aed, nameOf } from "@/lib/store/i18n";
import { getDict } from "@/lib/store/lang";
import { getStore } from "@/lib/store/menu";
import { specialsOpen } from "@/lib/store/schedule";
import { section } from "../../ui";
import { AddToCart } from "./add-to-cart";
import { Gallery } from "./gallery";
import { PackageBuilder } from "./package-builder";

const packageText = {
  en: (limits: { salad: number; starter: number; main: number }, challahs: number) => [
    `(${limits.salad}) salads of your choice – a selection of traditional flavors`,
    `(${limits.starter}) starters of your choice – fresh fish-based dishes crafted with care`,
    `(${limits.main}) main meat dishes of your choice – home-style dishes inspired by classic Shabbat recipes.`,
    `White rice, Oven-baked potatoes, Grape juice for Kiddush, ${challahs} Freshly baked challahs, Shabbat candles, Disposable tableware.`,
  ],
  he: (limits: { salad: number; starter: number; main: number }, challahs: number) => [
    `(${limits.salad}) סלטים לבחירה – מבחר טעמים מסורתיים`,
    `(${limits.starter}) ראשונות לבחירה – מנות דגים טריות שהוכנו באהבה`,
    `(${limits.main}) עיקריות בשר לבחירה – מנות ביתיות בהשראת מתכוני שבת קלאסיים.`,
    `אורז לבן, תפוחי אדמה בתנור, מיץ ענבים לקידוש, ${challahs} חלות טריות, נרות שבת, כלים חד פעמיים.`,
  ],
};

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

export async function generateMetadata({ params }: PageProps<"/shop/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const item = (await getStore()).product(handle);
  if (!item) return {};
  const prices = item.variants.map((variant) => variant.price).filter((value) => value > 0);
  const price = prices.length ? `${prices.length > 1 ? "From " : ""}${aed(Math.min(...prices))}` : "";
  const about = plain(item.body).slice(0, 150);
  const description = [item.he, price, about || "Kosher home-style food in Dubai."].filter(Boolean).join(" · ");
  return {
    title: item.title,
    description,
    openGraph: { type: "website", siteName: "Duba Dubai", title: `${item.title} · Duba Dubai`, description, url: `/shop/products/${handle}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/products/[handle]">) {
  const { handle } = await params;
  const store = await getStore();
  const item = store.product(handle);
  if (!item) notFound();
  const { lang, t } = await getDict();
  const name = nameOf(item, lang);
  const pack = isPackage(handle);
  const friday = store.fridayOnly(handle);
  const special = store.specials.has(handle);
  const closed = special && !specialsOpen();
  const limits = catalog.packages[handle];
  const variant = item.variants[0];
  const lines = pack ? packageText[lang](limits, handle === "family-friday-dinner" ? 3 : 2) : [];
  const hebrewBody = lang === "he" && Boolean(item.bodyHe?.trim());
  const body = hebrewBody ? item.bodyHe ?? "" : item.body;

  return (
    <main className={`${section} px-5 py-8 md:px-12 md:py-12`}>
      <div className="mx-auto max-w-[120rem]">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-12">
          <Gallery images={item.images} alt={name} />
          <div>
            <h1 className="text-3xl font-semibold leading-tight md:text-[40px]">{name}</h1>
            {pack ? (
              <p className="mt-3 text-xl" dir="ltr">
                <bdi>{aed(variant.price)}</bdi>
                {soldOut(item) ? <span className="ms-3 text-base text-white/70">{t.soldOut}</span> : null}
              </p>
            ) : (
              <div className="mt-3">
                <AddToCart item={item} lang={lang} friday={friday} special={special} closed={closed} />
              </div>
            )}
            {friday ? <p className="mt-6 rounded-lg bg-white/10 px-4 py-3 text-sm">{t.fridayOnly}</p> : null}
            {pack ? (
              <div className="mt-6 space-y-2 leading-7 text-white/85">
                {lines.slice(0, 3).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="pt-2 font-semibold">{t.packageIncludes}</p>
                <p>{lines[3]}</p>
                <p className="pt-2">
                  *{" "}
                  <Link href="/shop/products/electric-hot-plate-for-rent" className="font-semibold underline">
                    {lang === "he" ? "אפשר להוסיף פלטה לשישי ושבת" : "You can add a hot plate for Friday and Saturday"}
                  </Link>{" "}
                  *
                </p>
              </div>
            ) : hebrewBody ? (
              <p dir="rtl" className="mt-6 whitespace-pre-line text-start leading-7 text-white/85">
                {body}
              </p>
            ) : body ? (
              <div
                dir="ltr"
                className="mt-6 space-y-3 text-start leading-7 text-white/85 [&_li]:ms-5 [&_li]:list-disc [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : null}
            <details className="mt-6 border-y border-white/15 py-4" open>
              <summary className="cursor-pointer font-semibold">{t.deliveryTimes}</summary>
              <p className="mt-3 text-sm leading-6 text-white/80">{friday ? t.deliveryFriday : t.deliveryHour}</p>
              {friday ? null : <p className="mt-2 text-sm text-white/60">{t.deliveryNote}</p>}
            </details>
          </div>
        </div>
        {pack && !soldOut(item) ? (
          <PackageBuilder
            handle={handle}
            title={item.title}
            he={item.he}
            image={item.images[0] ?? ""}
            price={variant.price}
            variant={variant.kept}
            limits={limits}
            menu={store.menu}
            lang={lang}
          />
        ) : null}
      </div>
    </main>
  );
}
