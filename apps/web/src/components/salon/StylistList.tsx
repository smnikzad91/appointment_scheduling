import type { Salon } from "@/types/salon";
import StylistCard from "./StylistCard";

export default function StylistList({ salon }: { salon: Salon }) {
  if (salon.stylists.length === 0) return null;

  return (
    <section id="stylists" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">متخصصان</h2>
      <div className="flex flex-col gap-2">
        {salon.stylists.map((stylist) => (
          <StylistCard key={stylist.id} salon={salon} stylist={stylist} />
        ))}
      </div>
    </section>
  );
}
