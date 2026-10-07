import { ogContentType, ogImage, ogPhoto, ogSize } from "@/lib/og";
import { getStore } from "@/lib/store/menu";

export const alt = "Duba Dubai – Kosher food";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const item = (await getStore()).product(handle);
  if (!item) return ogImage({ photoPath: "assets/og-chef.jpg", title: "אוכל כשר ביתי", subtitle: "Duba Dubai" });
  const price = Math.min(...item.variants.map((variant) => variant.price).filter((value) => value > 0));
  const photo = item.images[0] ? await ogPhoto(item.images[0]) : undefined;
  return ogImage({
    photo,
    photoPath: photo ? undefined : "assets/og-dish.jpg",
    eyebrow: Number.isFinite(price) ? `${item.variants.length > 1 ? "FROM " : ""}AED ${price}` : "KOSHER FOOD · DUBAI",
    title: item.title,
    subtitle: item.he && item.he.length <= 26 ? item.he : "Kosher food · Dubai",
  });
}
