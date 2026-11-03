import { notFound } from "next/navigation";

// Unknown localized paths render the translated not-found page.
export default function CatchAll() {
  notFound();
}
