import { getDict } from "@/lib/store/lang";
import { shabbatClosed } from "@/lib/store/schedule";
import { section } from "../ui";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const { lang } = await getDict();
  return (
    <main className={`${section} min-h-[60dvh] px-5 py-10 md:px-12`}>
      <div className="mx-auto max-w-6xl">
        <CheckoutForm lang={lang} closed={shabbatClosed()} />
      </div>
    </main>
  );
}
