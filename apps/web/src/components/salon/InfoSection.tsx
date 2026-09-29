import { MapPin, Phone } from "lucide-react";
import type { Salon } from "@/types/salon";
import { toPersianDigits, formatMinutesAsClock } from "@/lib/persian";
import { PERSIAN_WEEKDAY_NAMES, WEEK_ORDER_SATURDAY_FIRST } from "@/lib/jalali";
import { toSalonWallTime } from "@/lib/salonTime";
import DirectionsButton from "./DirectionsButton";
import SalonMapLoader from "./SalonMapLoader";

export default function InfoSection({ salon }: { salon: Salon }) {
  const today = toSalonWallTime(new Date(), salon.timezone).dayOfWeek;

  return (
    <section id="info" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">اطلاعات و ساعات کاری</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-g-faint" aria-hidden />
            <span>
              {[salon.province, salon.city !== salon.province ? salon.city : null].filter(Boolean).join("، ")}
              {salon.province || salon.city ? "، " : ""}
              {salon.address}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-g-faint" aria-hidden />
            <a href={`tel:${salon.phone}`} dir="ltr" className="text-end">
              {toPersianDigits(salon.phone)}
            </a>
          </div>

          {salon.location && <DirectionsButton location={salon.location} salonName={salon.name} address={salon.address} />}

          <div className="mt-2 overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <tbody>
                {WEEK_ORDER_SATURDAY_FIRST.map((dayOfWeek) => {
                  const hours = salon.workingHours.find((h) => h.dayOfWeek === dayOfWeek);
                  const isToday = dayOfWeek === today;
                  return (
                    <tr key={dayOfWeek} className={isToday ? "font-medium" : ""}>
                      <td className="py-1 pe-3 text-g-muted">{PERSIAN_WEEKDAY_NAMES[dayOfWeek]}</td>
                      <td className="py-1 text-end">
                        {!hours || hours.closed
                          ? "تعطیل"
                          : `${formatMinutesAsClock(hours.startMinute)} تا ${formatMinutesAsClock(hours.endMinute)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {salon.location && (
          <div className="h-56 overflow-hidden rounded-xl sm:h-full sm:min-h-56">
            <SalonMapLoader location={salon.location} brandColor={salon.brandColor} />
          </div>
        )}
      </div>
    </section>
  );
}
