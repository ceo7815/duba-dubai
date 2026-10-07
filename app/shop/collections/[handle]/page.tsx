import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collectionLabels } from "@/lib/store/i18n";
import { getDict } from "@/lib/store/lang";
import { getStore } from "@/lib/store/menu";
import { specialsOpen } from "@/lib/store/schedule";
import { ProductGrid } from "../../product-card";
import { section } from "../../ui";

export async function generateMetadata({ params }: PageProps<"/shop/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const store = await getStore();
  const collection = store.collection(handle);
  if (handle !== "all" && !collection) return {};
  const en = collectionLabels[handle]?.en ?? collection?.title ?? "All products";
  const he = collectionLabels[handle]?.he ?? collection?.he ?? "";
  const count = store.collectionProducts(handle).length;
  const description = `${en}${he ? ` · ${he}` : ""} – ${count} kosher dishes from Duba Dubai. Order online for delivery or pickup.`;
  return {
    title: en,
    description,
    openGraph: { type: "website", siteName: "Duba Dubai", title: `${en} · Duba Dubai`, description, url: `/shop/collections/${handle}` },
  };
}

export default async function CollectionPage({ params }: PageProps<"/shop/collections/[handle]">) {
  const { handle } = await params;
  const store = await getStore();
  if (handle !== "all" && !store.collection(handle)) notFound();
  const { lang, t } = await getDict();
  const items = store.collectionProducts(handle);
  const open = specialsOpen();
  const title = collectionLabels[handle]?.[lang] ?? store.collection(handle)?.title ?? handle;

  return (
    <main className={`${section} min-h-[60dvh] px-5 py-10 md:px-12`}>
      <div className="mx-auto max-w-[120rem]">
        <h1 className="text-3xl font-semibold md:text-5xl">{title}</h1>
        {handle === "specials" ? (
          <>
            <p className="mt-4 max-w-3xl text-white/75">{t.specialsNote}</p>
            <p className="mt-2 text-sm font-semibold">{open ? t.specialsOpen : t.specialsClosed}</p>
          </>
        ) : null}
        <p className="mt-4 text-sm text-white/60">
          {items.length} {t.products}
        </p>
        <ProductGrid
          items={items}
          lang={lang}
          t={t}
          badge={(item) => (store.specials.has(item.handle) && !open ? t.unavailable : undefined)}
        />
      </div>
    </main>
  );
}
