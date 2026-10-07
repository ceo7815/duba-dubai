import { ogContentType, ogImage, ogPhoto, ogSize } from "@/lib/og";
import { collectionLabels } from "@/lib/store/i18n";
import { getStore } from "@/lib/store/menu";

export const alt = "Duba Dubai – Kosher food";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const store = await getStore();
  const collection = store.collection(handle);
  const cover = collection?.image || store.collectionProducts(handle)[0]?.images[0] || "";
  const photo = cover ? await ogPhoto(cover) : undefined;
  const he = collectionLabels[handle]?.he ?? collection?.he ?? "";
  return ogImage({
    photo,
    photoPath: photo ? undefined : "assets/og-chef.jpg",
    eyebrow: "DUBA DUBAI · KOSHER FOOD",
    title: collectionLabels[handle]?.en ?? collection?.title ?? "Our Menu",
    subtitle: he && he.length <= 26 ? he : "Order online · Delivery & pickup",
  });
}
