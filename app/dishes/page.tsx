import { redirect } from "next/navigation";
import { toggleShortage } from "@/app/dishes/actions";
import { DishForm } from "@/app/dishes/dish-form";
import { Work } from "@/app/shell";
import { menuGroups } from "@/lib/catalog";
import { money } from "@/lib/domain";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type Dish = {
  id: string;
  name: string;
  grams: number;
  cost: number;
  price: number;
  shortage: boolean;
  category: string;
  image_url: string;
};

export default async function DishesPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("dishes")
    .select("id, name, grams, cost, price, shortage, category, image_url")
    .order("position", { ascending: true });
  const dishes = (data ?? []) as Dish[];

  return (
    <Work title="מנות" backHref="/more" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        המחירים והתמונות מהאתר. חוסר הוא סימון ידני, בלי מחסן.
      </p>
      {[...menuGroups, "נוספות"].map((group) => {
        const rows =
          group === "נוספות"
            ? dishes.filter((dish) => !(menuGroups as readonly string[]).includes(dish.category))
            : dishes.filter((dish) => dish.category === group);
        if (rows.length === 0) return null;
        return (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">{group}</h2>
            {rows.map((dish) => {
              const margin = Number(dish.price) - Number(dish.cost);
              return (
                <article key={dish.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt="" className="size-20 rounded-2xl object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold">{dish.name}</h3>
                    <p className="mt-1 text-sm">{money(Number(dish.price))}</p>
                    <p className="mt-1 text-sm text-muted">
                      {dish.grams > 0 ? `${dish.grams} גרם · ` : ""}
                      נשאר על המנה {money(margin)}
                    </p>
                    <form action={toggleShortage} className="mt-3">
                      <input type="hidden" name="id" value={dish.id} />
                      <input type="hidden" name="shortage" value={dish.shortage ? "no" : "yes"} />
                      <button className={dish.shortage ? "button" : "button-quiet"}>
                        {dish.shortage ? "חסר" : "קיים"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
      <DishForm />
    </Work>
  );
}
