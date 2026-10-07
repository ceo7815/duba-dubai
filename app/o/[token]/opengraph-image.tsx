import { ogContentType, ogSize } from "@/lib/og";
import { summaryAlt, summaryImage } from "@/lib/og-summary";

export const alt = summaryAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return summaryImage();
}
