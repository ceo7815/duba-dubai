import { getDict } from "@/lib/store/lang";
import { shabbatClosed } from "@/lib/store/schedule";
import { section } from "../ui";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const { lang } = await getDict();
  return (
    <main className={`${section} min-h-[60dvh] px-5 py-10 md:px-12`}>
      <div className="mx-auto max-w-5xl">
        <CartView lang={lang} closed={shabbatClosed()} />
      </div>
    </main>
  );
}
