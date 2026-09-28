/** SMS telling a customer the salon or their stylist booked them (Persian calendar, salon time). */
export function bookingSmsText(a: { salonName: string; stylistName: string; startAt: Date; timeZone: string }): string {
  const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: a.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(a.startAt);
  const time = new Intl.DateTimeFormat("fa-IR", {
    timeZone: a.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(a.startAt);
  return `نوبت شما در ${a.salonName} برای ${day} ساعت ${time} با ${a.stylistName} ثبت شد.`;
}
