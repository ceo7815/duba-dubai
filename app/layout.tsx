import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { cookies } from "next/headers";
import { flashCookie } from "@/lib/flash";
import { FlashToast } from "./flash-toast";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "800"],
  variable: "--font-rubik",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://duba-dubai.1wp.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "דובה",
  title: "דובה · מערכת הניהול",
  description: "מערכת הניהול של דובה – הזמנות, מטבח, לקוחות וכספים במקום אחד.",
  openGraph: {
    type: "website",
    siteName: "Duba Dubai",
    locale: "he_IL",
    title: "דובה · מערכת הניהול",
    description:
      "מערכת הניהול של דובה – הזמנות, מטבח, לקוחות וכספים במקום אחד.",
  },
  appleWebApp: { capable: true, title: "דובה", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const flash = (await cookies()).get(flashCookie)?.value ?? "";
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full`}>
      <body className="min-h-dvh antialiased">
        {children}
        <FlashToast value={flash} />
      </body>
    </html>
  );
}
