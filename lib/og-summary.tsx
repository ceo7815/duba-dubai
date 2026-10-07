import { ogImage } from "@/lib/og";

export const summaryAlt = "סיכום ההזמנה שלך מדובה";
export const summaryDescription = "סיכום ההזמנה שלך מדובה – מנות, מועד, כתובת וסכום לתשלום. לחצו לצפייה ולאישור.";

export function summaryImage() {
  return ogImage({
    photoPath: "assets/og-dish.jpg",
    eyebrow: "ORDER SUMMARY",
    title: "סיכום ההזמנה שלך",
    subtitle: "מנות, מועד ותשלום",
  });
}
