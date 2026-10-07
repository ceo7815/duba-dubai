import Link from "next/link";
import { catalog, type Product } from "@/lib/store/catalog";
import { type Dict, type Lang } from "@/lib/store/i18n";
import { getDict } from "@/lib/store/lang";
import { getStore } from "@/lib/store/menu";
import { specialsOpen } from "@/lib/store/schedule";
import { ProductGrid } from "./product-card";
import { CustomersStrip, section, ViewAll } from "./ui";

export default async function ShopHome() {
  const [{ lang, t }, store] = await Promise.all([getDict(), getStore()]);
  const image = (handle: string) => store.product(handle)?.images[0] ?? "";
  const first = (handle: string, count = 4) => store.collectionProducts(handle).slice(0, count);
  const open = specialsOpen();
  const he = lang === "he";
  const tiles = [
    { label: t.shabbat, href: "/shop/collections/shabbat-meal-packages", image: catalog.extras.shabbat },
    { label: t.kosher, href: "/shop/pages/kosher-certificate", image: catalog.extras.kosher },
    { label: t.mainCourses, href: "/shop/collections/main-courses", image: image("roast-beef-with-mushrooms") },
    { label: t.sandwiches, href: "/shop/collections/sandwiches", image: image("halat-schnitzel") },
    { label: t.sideDishes, href: "/shop/collections/side-dishes", image: catalog.extras.sides },
    { label: he ? "ארוחות עסקיות" : "Business Lunch", href: "/shop/collections/combos", image: image("hamburger-combo") },
    { label: t.salad, href: "/shop/collections/starters", image: image("matbucha-condiment") },
    { label: he ? "קינוחים" : "Desserts", href: "/shop/collections/desserts", image: image("yeast-cake") },
  ];
  const packages = ["friday-couples-meal", "family-friday-dinner"].map((handle) => store.product(handle)).filter(Boolean) as Product[];

  return (
    <main>
      <section className={`${section} px-5 py-8 md:px-12`}>
        <ul className="mx-auto grid max-w-[120rem] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {tiles.map((tile) => (
            <li key={tile.href}>
              <Link href={tile.href} className="group relative block aspect-square overflow-hidden rounded-lg">
                <img src={tile.image} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent to-55%" />
                <h3 className="absolute bottom-3 start-3 text-base font-semibold group-hover:underline md:bottom-5 md:start-5 md:text-2xl">
                  {tile.label} {he ? "←" : "→"}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Featured title={t.packages} items={packages} lang={lang} t={t} center />

      <section className={`${section} px-5 py-8 md:px-12`}>
        <div className="mx-auto max-w-[120rem]">
          <h2 className="text-3xl font-semibold md:text-[40px]">{t.specialsTitle}</h2>
          <p className="mt-3 max-w-3xl text-white/75">{t.specialsNote}</p>
          <p className="mt-2 text-sm font-semibold">{open ? t.specialsOpen : t.specialsClosed}</p>
          <ProductGrid items={first("specials")} lang={lang} t={t} badge={() => (open ? undefined : t.unavailable)} />
          <ViewAll href="/shop/collections/specials" label={t.viewAll} />
        </div>
      </section>

      <Featured title={t.sandwiches} items={first("sandwiches")} more="/shop/collections/sandwiches" lang={lang} t={t} />

      <section className="bg-black px-5 py-8 md:px-12">
        <img src={catalog.extras.kosher} alt={t.kosher} className="mx-auto w-full max-w-3xl rounded-lg" />
      </section>

      <section className={`${section} px-5 py-10 md:px-12`}>
        <div className="mx-auto grid max-w-[120rem] items-center gap-8 md:grid-cols-2">
          <img src={catalog.extras.chef} alt="" className="w-full rounded-lg object-cover" />
          <div>
            <h2 className="text-3xl font-semibold md:text-[40px]">{t.chef}</h2>
            {he ? (
              <>
                <p className="mt-5 leading-7 text-white/80">
                  השף זוהר חדאני הוא בוגר בית הספר לאמנויות הקולינריה &quot;תדמור&quot;, מהמוסדות המובילים בישראל. עם
                  יותר מ-35 שנות ניסיון, השף חדאני הוביל מטבחים כשרים במקומות יוקרתיים ומיוחדים, ובהם כשף ראשי במלון
                  &quot;פור סיזנס&quot; בנתניה.
                </p>
                <p className="mt-4 leading-7 text-white/80">
                  לאורך הקריירה צבר השף זוהר ידע ומומחיות רחבים במגוון טכניקות בישול. הוא מתבלט ביצירתיות ובחתירה
                  בלתי פוסקת לשלמות בכל מנה שהוא יוצר.
                </p>
              </>
            ) : (
              <>
                <p className="mt-5 leading-7 text-white/80">
                  Chef Zohar Hadani is a graduate of the prestigious &quot;Tadmor&quot; Culinary Arts School, one of the
                  leading culinary institutions in Israel. With over 35 years of extensive experience, Chef Hadani has
                  led kosher kitchens in various prestigious and unique settings, including serving as the Executive
                  Chef at the &quot;Four Seasons&quot; hotel in Netanya.
                </p>
                <p className="mt-4 leading-7 text-white/80">
                  Throughout his career, Chef Zohar has gained deep knowledge and expertise in a wide range of cooking
                  techniques. He distinguishes himself through creativity and a relentless pursuit of perfection in
                  every dish he creates.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <Featured title={t.mainCourses} items={first("main-courses")} more="/shop/collections/main-courses" lang={lang} t={t} />
      <Featured title={t.sideDishes} items={first("side-dishes")} more="/shop/collections/side-dishes" lang={lang} t={t} />

      <section className="bg-black">
        <video src={catalog.extras.video} autoPlay muted loop playsInline className="mx-auto w-full max-w-[120rem]" />
      </section>

      <CustomersStrip title={t.customers} love={t.love} />
    </main>
  );
}

function Featured({
  title,
  items,
  more,
  lang,
  t,
  center = false,
}: {
  title: string;
  items: Product[];
  more?: string;
  lang: Lang;
  t: Dict;
  center?: boolean;
}) {
  return (
    <section className={`${section} px-5 py-8 md:px-12`}>
      <div className="mx-auto max-w-[120rem]">
        <h2 className="text-3xl font-semibold md:text-[40px]">{title}</h2>
        <ProductGrid items={items} lang={lang} t={t} center={center} />
        {more ? <ViewAll href={more} label={t.viewAll} /> : null}
      </div>
    </section>
  );
}