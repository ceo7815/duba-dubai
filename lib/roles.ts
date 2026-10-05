export const roles = ["owner", "kitchen", "accounts", "integrations"] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  owner: "בעלים",
  kitchen: "מטבח",
  accounts: "חשבונות",
  integrations: "חיבורים",
};

export const roleNotes: Record<Role, string> = {
  owner: "הכל, כולל משתמשים וכסף",
  kitchen: "פתק היום. בלי רווח ובלי מחיקה",
  accounts: "חשבוניות ותשלומים. בלי מטבח",
  integrations: "שופיפיי וסטרייפ. בלי תפעול יומי",
};

export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}
