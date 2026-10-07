import Link from "next/link";

export function PrintButton({ orderId }: { orderId: string }) {
  return (
    <Link href={`/orders/${orderId}/print`} className="button flex items-center justify-center">
      הדפסה למטבח ולשקית
    </Link>
  );
}
