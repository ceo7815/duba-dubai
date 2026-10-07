import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "מערכת הניהול של דובה";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage({
    eyebrow: "MANAGEMENT SYSTEM",
    title: "מערכת הניהול",
    subtitle: "כניסה לצוות דובה · הזמנות, מטבח וכספים",
  });
}
