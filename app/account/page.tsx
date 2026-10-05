import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { roleLabels, roleNotes } from "@/lib/roles";

export default async function AccountPage() {
  const profile = await requireProfile();

  return (
    <Work
      title="החשבון"
      backHref={profile.role === "owner" ? "/more" : undefined}
      role={profile.role}
    >
      <section className="rounded-2xl border border-line bg-card px-4 py-5">
        <p className="text-2xl font-extrabold">{profile.full_name}</p>
        <p className="mt-2 text-base font-bold">{roleLabels[profile.role]}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{roleNotes[profile.role]}</p>
        {profile.role === "integrations" ? (
          <p className="mt-4 text-sm leading-6 text-muted">
            חיבור שופיפיי וסטרייפ מחכה לטלפון של נבו.
          </p>
        ) : null}
      </section>
    </Work>
  );
}
