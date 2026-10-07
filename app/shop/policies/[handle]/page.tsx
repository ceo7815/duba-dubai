import { notFound } from "next/navigation";
import { catalog } from "@/lib/store/catalog";
import { getDict } from "@/lib/store/lang";
import { section } from "../../ui";

export default async function PolicyPage({ params }: PageProps<"/shop/policies/[handle]">) {
  const { handle } = await params;
  const policy = catalog.policies[handle];
  if (!policy) notFound();
  const { t } = await getDict();

  return (
    <main className={`${section} px-5 py-10 md:px-12`}>
      <div className="mx-auto max-w-3xl" dir="ltr">
        {t.policyEnglish ? (
          <p className="mb-6 rounded-lg bg-white/10 px-4 py-3 text-sm" dir="rtl">
            {t.policyEnglish}
          </p>
        ) : null}
        <h1 className="text-4xl font-semibold">{policy.title}</h1>
        <div
          className="mt-8 space-y-4 leading-7 text-white/85 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:ms-5 [&_li]:list-disc [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: policy.html }}
        />
      </div>
    </main>
  );
}
