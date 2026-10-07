import Link from "next/link";
import { catalog } from "@/lib/store/catalog";

export const section =
  "bg-[linear-gradient(65deg,#000_84%,#f3f3f3_97%)] rtl:bg-[linear-gradient(-65deg,#000_84%,#f3f3f3_97%)]";

export function CustomersStrip({ title, love }: { title: string; love: string }) {
  return (
    <section className={`${section} overflow-hidden border-y-4 border-black py-7 lg:py-9`}>
      <h2 className="text-center text-[34px] font-bold leading-[1.3] tracking-[0.6px] lg:text-[40px]">{title}</h2>
      <div className="group mt-[38px] flex overflow-hidden lg:mt-[50px]" dir="ltr">
        <div className="flex w-max shrink-0 animate-[shop-marquee_200s_linear_infinite] gap-[18px] ps-[18px] group-hover:[animation-play-state:paused]">
          {[...catalog.customerPhotos, ...catalog.customerPhotos].map((photo, index) => (
            <img
              key={`${photo}-${index}`}
              src={photo}
              alt=""
              loading="lazy"
              className="h-[300px] w-[170px] shrink-0 rounded object-cover lg:h-[400px] lg:w-[230px]"
            />
          ))}
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-[30px] max-w-[340px] rounded-[10px] bg-white p-[23px] text-center shadow-[-3px_7px_9px_-2px_#a09c9c] lg:-mt-[60px] lg:p-[30px]">
        <p className="text-[17px] text-[#121212] lg:text-[20px]">{love}</p>
      </div>
    </section>
  );
}

export function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-6 flex justify-center">
      <Link href={href} className="rounded-lg bg-white px-10 py-3 text-[15px] font-semibold text-black hover:bg-white/90">
        {label}
      </Link>
    </div>
  );
}
