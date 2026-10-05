export const menuGroups = [
  "סלטים",
  "עיקריות",
  "תוספות",
  "כריכים",
  "שבת",
  "שתייה",
  "קינוחים",
  "עסקי",
  "מיוחדים",
] as const;

export type MenuDish = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  shortage: boolean;
};
