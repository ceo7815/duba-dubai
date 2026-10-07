import Link from "next/link";
import { fromPrice, soldOut, type Product } from "@/lib/store/catalog";
import { aed, nameOf, type Dict, type Lang } from "@/lib/store/i18n";

export function ProductCard({ item, lang, t, badge: given }: { item: Product; lang: Lang; t: Dict; badge?: string }) {
  const price = fromPrice(item);
  const name = nameOf(item, lang);
  const badge = soldOut(item) ? t.soldOut : given;
  return (
    <Link href={`/shop/products/${item.handle}`} className="group relative block overflow-hidden rounded-lg bg-[#1a1a1a]">
      <div className="aspect-square">
        {item.images[0] ? (
          <img
            src={item.images[0]}
            alt={name}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent to-55%" />
      {badge ? (
        <span className="absolute start-2.5 top-2.5 rounded-full bg-black/70 px-2.5 py-1 text-xs">{badge}</span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <h3 className="text-[15px] font-semibold leading-tight group-hover:underline md:text-base">{name}</h3>
        <p className="mt-1 text-sm md:text-base">
          {price.varies ? `${t.from} ` : ""}
          <bdi dir="ltr">{aed(price.low)}</bdi>
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({
  items,
  lang,
  t,
  badge,
  center = false,
}: {
  items: Product[];
  lang: Lang;
  t: Dict;
  badge?: (item: Product) => string | undefined;
  center?: boolean;
}) {
  return (
    <ul
      className={`mt-6 grid grid-cols-2 gap-3 md:gap-4 ${center ? "md:mx-auto md:max-w-[calc(50%+0.5rem)] md:grid-cols-2" : "md:grid-cols-4"}`}
    >
      {items.map((item) => (
        <li key={item.handle}>
          <ProductCard item={item} lang={lang} t={t} badge={badge?.(item)} />
        </li>
      ))}
    </ul>
  );
}
