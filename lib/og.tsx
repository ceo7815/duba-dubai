import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const file = (path: string) => readFile(join(process.cwd(), path));

async function dataUri(path: string, type: string) {
  return `data:${type};base64,${(await file(path)).toString("base64")}`;
}

// Satori has no bidi support, so Hebrew lines are laid out right-to-left by hand.
// Keep each Hebrew line short enough not to wrap, and free of Latin text or digits.
function rtl(text?: string) {
  if (!text || !/[\u0590-\u05FF]/.test(text)) return text;
  return [...text].reverse().join("");
}

export type OgCard = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  photo?: string;
  photoPath?: "assets/og-chef.jpg" | "assets/og-dish.jpg";
};

export async function ogPhoto(src: string) {
  try {
    const source = /^https:\/\//.test(src)
      ? Buffer.from(await (await fetch(src)).arrayBuffer())
      : src.startsWith("/") && !src.includes("..")
        ? await file(join("public", src))
        : null;
    if (!source) return undefined;
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(source).resize(560, 630, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function ogImage(card: OgCard) {
  const { photo, photoPath } = card;
  const [title, subtitle, eyebrow] = [rtl(card.title), rtl(card.subtitle), rtl(card.eyebrow)];
  const [logo, medium, bold, picture] = await Promise.all([
    dataUri("public/brand/duba-logo.png", "image/png"),
    file("assets/fonts/Rubik-Medium.ttf"),
    file("assets/fonts/Rubik-ExtraBold.ttf"),
    photo ? Promise.resolve(photo) : photoPath ? dataUri(photoPath, "image/jpeg") : Promise.resolve(""),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#000", color: "#fff", fontFamily: "Rubik" }}>
        {picture ? (
          <div style={{ display: "flex", position: "relative", width: 560, height: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture} alt="" width={560} height={630} style={{ objectFit: "cover", width: 560, height: 630 }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%)",
              }}
            />
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: picture ? "flex-end" : "center",
            textAlign: picture ? "right" : "center",
            flex: 1,
            padding: picture ? "0 72px 0 40px" : "0 80px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={picture ? 330 : 420} height={picture ? 101 : 128} />
          {eyebrow ? (
            <div style={{ marginTop: 44, fontSize: 26, letterSpacing: 4, color: "#a3a3a3", fontWeight: 500 }}>{eyebrow}</div>
          ) : null}
          <div
            style={{
              marginTop: eyebrow ? 14 : 48,
              fontSize: (title?.length ?? 0) > 22 ? 50 : picture ? 62 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ marginTop: 22, fontSize: 30, color: "#d4d4d4", fontWeight: 500, lineHeight: 1.35 }}>{subtitle}</div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Rubik", data: medium, weight: 500, style: "normal" },
        { name: "Rubik", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
