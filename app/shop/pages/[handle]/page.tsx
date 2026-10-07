import { notFound } from "next/navigation";
import { catalog } from "@/lib/store/catalog";
import { getDict } from "@/lib/store/lang";
import { CustomersStrip, section } from "../../ui";
import { ContactForm } from "./contact-form";

const about = {
  en: {
    title: "Who Are We?",
    story: [
      "Nestled in the vibrant desert of Dubai, Duba has emerged as a unique kosher dining destination. Our establishment reflects a profound passion for culinary excellence, resilience in overcoming challenges, and a deep connection to our family roots.",
      "Our journey began during a family holiday in Dubai, where the sparse kosher offerings sparked our inspiration. We envisioned bringing the warmth and flavors of our family’s kitchen to Dubai’s food scene. This vision became a mission, leading us to establish not only a catering but a community center that offers a truly memorable kosher dining experience.",
      "From our inception, we aimed for nothing less than perfection. We handpicked a premier team, developed a cutting-edge kitchen and crafted an elegant and diverse menu that incorporates fresh, quality ingredients and authentic family cooking techniques.",
      "Duba was founded on the pillars of hospitality that have always been integral to our family, providing a warm, welcoming environment whether for large family celebrations or casual gatherings.",
    ],
    people: [
      "At the heart of Duba is Chef Zohar Hadani, our head chef and co-owner, who has 35 years of culinary experience worldwide. Ilanit Nathan, with extensive expertise in restaurant and event management, shapes Duba’s vision and values. CEO Nevo Amit Nathan leads our daily operations with passion and dedication, making our vision a reality.",
    ],
    place: [
      "Duba transcends the traditional boundaries of a catering service. It is a community center and a familial home where we host delightful meals every Friday in our private apartment, embracing each guest with warmth and hospitality. Our kitchen focuses on creating dishes that are fresh, high-quality, and lovingly prepared, making every visitor feel instantly at home.",
      "Duba’s atmosphere is one of tranquility and intimacy, akin to visiting close family. The inviting aromas from our open kitchen, our dedicated staff, and the cozy, home-style decor all contribute to a welcoming space where guests are not merely customers but cherished members of our extended family.",
    ],
  },
  he: {
    title: "מי אנחנו?",
    story: [
      "בלב המדבר התוסס של דובאי צמחה דובה כיעד ייחודי לאוכל כשר. המקום משקף תשוקה עמוקה למצוינות קולינרית, עמידות מול אתגרים וחיבור עמוק לשורשים המשפחתיים שלנו.",
      "המסע שלנו התחיל בחופשה משפחתית בדובאי, כשהיצע האוכל הכשר הדל הצית בנו השראה. חלמנו להביא את החום והטעמים של המטבח המשפחתי שלנו לסצנת האוכל של דובאי. החלום הפך למשימה, והוביל אותנו להקים לא רק קייטרינג אלא מרכז קהילתי שמציע חוויית אוכל כשר בלתי נשכחת.",
      "מהיום הראשון שאפנו לשלמות. בחרנו בקפידה צוות מוביל, הקמנו מטבח מתקדם ובנינו תפריט מגוון ואלגנטי שמשלב חומרי גלם טריים ואיכותיים עם טכניקות בישול משפחתיות אותנטיות.",
      "דובה נוסדה על ערכי הכנסת האורחים שתמיד היו חלק מהמשפחה שלנו, ומציעה סביבה חמה ומזמינה, בין אם לחגיגה משפחתית גדולה ובין אם למפגש קליל.",
    ],
    people: [
      "בלב דובה עומד השף זוהר חדאני, השף הראשי והשותף, עם 35 שנות ניסיון קולינרי ברחבי העולם. אילנית נתן, עם ניסיון רב בניהול מסעדות ואירועים, מעצבת את החזון והערכים של דובה. המנכ״ל נבו עמית נתן מוביל את התפעול היומיומי בתשוקה ובמסירות, והופך את החזון למציאות.",
    ],
    place: [
      "דובה חורגת מהגבולות המסורתיים של שירות קייטרינג. זהו מרכז קהילתי ובית משפחתי שבו אנחנו מארחים ארוחות מיוחדות בכל יום שישי בדירה הפרטית שלנו, ומקבלים כל אורח בחום ובהכנסת אורחים. המטבח שלנו מתמקד במנות טריות, איכותיות ומוכנות באהבה, כך שכל מבקר מרגיש מיד בבית.",
      "האווירה בדובה שלווה ואינטימית, כמו ביקור אצל משפחה קרובה. הריחות המזמינים מהמטבח הפתוח, הצוות המסור והעיצוב הביתי והחמים יוצרים מקום שבו האורחים הם לא רק לקוחות אלא בני משפחה מורחבת.",
    ],
  },
};

export default async function InfoPage({ params }: PageProps<"/shop/pages/[handle]">) {
  const { handle } = await params;
  const { lang, t } = await getDict();

  if (handle === "about-us") {
    const text = about[lang];
    const blocks = [
      { title: t.storyTitle, image: catalog.extras.story, body: text.story },
      { title: t.peopleTitle, image: catalog.extras.people, body: text.people },
      { title: t.placeTitle, image: catalog.extras.chef, body: text.place },
    ];
    return (
      <main>
        <section className={`${section} px-5 py-10 md:px-12`}>
          <div className="mx-auto max-w-6xl">
            <h1 className="text-center text-4xl font-semibold md:text-5xl">{text.title}</h1>
            <div className="mt-10 space-y-14">
              {blocks.map((block, index) => (
                <div key={block.title} className="grid items-center gap-8 md:grid-cols-2">
                  <img
                    src={block.image}
                    alt=""
                    className={`w-full rounded-lg object-cover ${index % 2 === 1 ? "md:order-2" : ""}`}
                  />
                  <div>
                    <h2 className="text-3xl font-semibold md:text-[40px]">{block.title}</h2>
                    {block.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 24)} className="mt-4 leading-7 text-white/80">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <CustomersStrip title={t.customers} love={t.love} />
      </main>
    );
  }

  if (handle === "contact-1") {
    return (
      <main className={`${section} min-h-[60dvh] px-5 py-10 md:px-12`}>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold md:text-5xl">{t.contact}</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a href="https://wa.me/971559060717" target="_blank" rel="noreferrer" className="rounded-xl border border-white/20 p-5 hover:border-white">
              <p className="text-2xl">📞</p>
              <p className="mt-2 font-semibold">{t.phoneWhatsapp}</p>
              <p className="mt-1 text-white/75" dir="ltr">
                +971-55-906-0717
              </p>
            </a>
            <a href="mailto:office@dubacatering.com" className="rounded-xl border border-white/20 p-5 hover:border-white">
              <p className="text-2xl">📧</p>
              <p className="mt-2 font-semibold">{t.emailLabel}</p>
              <p className="mt-1 text-white/75" dir="ltr">
                office@dubacatering.com
              </p>
            </a>
          </div>
          <p className="mt-6 font-semibold">{t.officeAddress}</p>
          <p className="mt-1 text-white/75" dir="rtl" lang="ar">
            ملك محمد بن الزبير بن على – ديرة دي – القرهود A34 – مكتب 103
          </p>
          <p className="mt-8 text-white/80">{t.contactLead}</p>
          <ContactForm lang={lang} />
        </div>
      </main>
    );
  }

  if (handle === "kosher-certificate") {
    return (
      <main className={`${section} px-5 py-10 md:px-12`}>
        <div className="mx-auto max-w-4xl">
          <h1 className="text-center text-4xl font-semibold md:text-5xl">{t.kosher}</h1>
          <img src={catalog.extras.kosher} alt={t.kosher} className="mt-8 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  notFound();
}
