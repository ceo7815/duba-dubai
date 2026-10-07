import Link from "next/link";
import { section } from "./ui";

export default function ShopNotFound() {
  return (
    <main className={`${section} flex min-h-[60dvh] flex-col items-center justify-center px-5 py-16 text-center`}>
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="mt-3 text-white/75">Page not found · הדף לא נמצא</p>
      <Link href="/shop" className="mt-8 rounded-lg bg-white px-10 py-3 font-semibold text-black">
        Duba Kosher
      </Link>
    </main>
  );
}
