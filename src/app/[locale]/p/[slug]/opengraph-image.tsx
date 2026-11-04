import { ImageResponse } from "next/og";
import { getPlanBySlug } from "@/server/plans";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Quadra";

/** Preview card for WhatsApp & co: the plan's title on the 2×2 mark. */
export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const b = await getPlanBySlug(slug).catch(() => null);
  const title = b?.plan.title ?? "Quadra";
  const cells = [
    true,
    false,
    false,
    true,
    true,
    false,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    true,
    false,
    true,
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        background: "#eef1fa",
        color: "#141414",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 640,
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: "#0f5257",
              borderRadius: 6,
            }}
          />
          Quadra
        </div>
        <div
          style={{
            fontSize: title.length > 40 ? 64 : 80,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.02,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: 360,
          gap: 12,
          alignContent: "center",
        }}
      >
        {cells.map((on, i) => (
          <div
            key={i}
            style={{
              width: 78,
              height: 78,
              borderRadius: 10,
              background: on ? (i === 5 ? "#1d5fbf" : "#16a34a") : "#ffffff",
              border: on ? "none" : "2px solid #e6e6e6",
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
