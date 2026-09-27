import type { WorkingHours } from "@/types/salon";
import { formatMinutesAsClock } from "@/lib/persian";

function getStatus(workingHours: WorkingHours[], now: Date) {
  const today = workingHours.find((h) => h.dayOfWeek === now.getDay());
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (!today || today.closed) {
    return { open: false, todayHours: today };
  }

  return { open: nowMinutes >= today.startMinute && nowMinutes < today.endMinute, todayHours: today };
}

export default function OpenStatusBadge({ workingHours }: { workingHours: WorkingHours[] }) {
  const { open, todayHours } = getStatus(workingHours, new Date());

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        open
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-gray-400"}`} aria-hidden />
      {open
        ? `باز است تا ${formatMinutesAsClock(todayHours!.endMinute)}`
        : todayHours && !todayHours.closed
        ? `بسته است — از ${formatMinutesAsClock(todayHours.startMinute)} باز می‌شود`
        : "امروز تعطیل است"}
    </span>
  );
}
