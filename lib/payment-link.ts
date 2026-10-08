export function paymentLink(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== "stripe.com" && !host.endsWith(".stripe.com")) return null;
    return url.href;
  } catch {
    return null;
  }
}
