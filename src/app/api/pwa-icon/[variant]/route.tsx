import { markImage } from "@/lib/pwa-icon";

const VARIANTS = {
  "192": { size: 192, pad: 0.14 },
  "512": { size: 512, pad: 0.14 },
  // Maskable: the platform may crop to a circle, keep the mark in the safe zone.
  maskable: { size: 512, pad: 0.24 },
  // Android status-bar badge: only the alpha channel is used.
  badge: { size: 96, pad: 0.08, ink: "#ffffff", ground: "transparent" },
} as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ variant: string }> },
) {
  const { variant } = await ctx.params;
  const v = VARIANTS[variant as keyof typeof VARIANTS];
  if (!v) return new Response(null, { status: 404 });
  const res = markImage(v);
  res.headers.set("Cache-Control", "public, max-age=86400, immutable");
  return res;
}
