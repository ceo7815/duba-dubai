import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Duba Dubai – Kosher food & catering in Dubai";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({
    photoPath: "assets/og-chef.jpg",
    eyebrow: "KOSHER FOOD · DUBAI",
    title: "אוכל כשר ביתי",
    subtitle: "Shabbat meals, catering & delivery",
  });
}
