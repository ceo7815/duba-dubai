export const roles = ["owner", "manager", "kitchen", "developer"] as const;

export type Role = (typeof roles)[number] | "accounts" | "integrations";

export const roleLabels: Record<Role, string> = {
  owner: "בעלים",
  manager: "מנהל",
  kitchen: "עובד",
  developer: "מחלקת פיתוח",
  accounts: "חשבונות",
  integrations: "חיבורים",
};

export const roleNotes: Record<Role, string> = {
  owner: "הכל, כולל משתמשים וכספים",
  manager: "הזמנות, היום, לוח, תפריט ולקוחות. בלי כספים ובלי משתמשים",
  kitchen: "מסך היום בלבד. בלי סכומים ובלי מחיקה",
  developer: "הכל, כולל משתמשים וכספים · תחזוקת המערכת",
  accounts: "חשבוניות ותשלומים. בלי מטבח",
  integrations: "חנות האתר וסטרייפ. בלי תפעול יומי",
};

export function isRole(value: string): value is (typeof roles)[number] {
  return (roles as readonly string[]).includes(value);
}

export function fullAccess(role: Role | undefined | null) {
  return role === "owner" || role === "developer";
}

export function canOperate(role: Role | undefined | null) {
  return fullAccess(role) || role === "manager";
}
