import { ImageResponse } from "next/og";

export const BRAND_INK = "#0f5257";
export const BRAND_GROUND = "#eef1fa";

/**
 * The 2×2 mark (one filled square, three outlined) as a PNG.
 * `pad` is the share of the canvas kept empty around the mark (maskable icons need ~20 %).
 */
export function markImage({
  size,
  pad,
  ink = BRAND_INK,
  ground = BRAND_GROUND,
}: {
  size: number;
  pad: number;
  ink?: string;
  ground?: string;
}) {
  const inner = size * (1 - pad * 2);
  const u = inner / 20; // icon.svg uses a 20-unit box
  const stroke = 1.75 * u;
  const cell = (filled: boolean) => ({
    width: 8 * u,
    height: 8 * u,
    borderRadius: 1.5 * u,
    background: filled ? ink : "transparent",
    border: filled ? "none" : `${stroke}px solid ${ink}`,
    display: "flex",
  });
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ground,
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignContent: "space-between",
          padding: u,
        }}
      >
        <div style={cell(true)} />
        <div style={cell(false)} />
        <div style={cell(false)} />
        <div style={cell(false)} />
      </div>
    </div>,
    { width: size, height: size },
  );
}
