import { markImage } from "@/lib/pwa-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon on iOS (no transparency: iOS fills it with black). */
export default function AppleIcon() {
  return markImage({ size: 180, pad: 0.16 });
}
