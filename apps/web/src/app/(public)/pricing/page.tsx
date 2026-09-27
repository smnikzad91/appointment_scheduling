import { redirect } from "next/navigation";

// Plans live in the landing page's pricing section (components/marketing/Pricing.tsx) —
// one source of truth instead of a second, diverging price list.
export default function PricingPage() {
  redirect("/#pricing");
}
