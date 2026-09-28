/** What an appointment SMS tells the customer. Also the suffix of its clientSmsId. */
export type AppointmentSmsKind = "booked" | "reminder" | "cancelled";

export interface AppointmentSmsInput {
  salonName: string;
  stylistName: string;
  startAt: Date;
  timeZone: string;
}

/** "سه‌شنبه ۷ مهر ساعت ۱۴:۳۰" — Persian calendar, in the salon's time zone. */
function when(startAt: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(startAt);
  const time = new Intl.DateTimeFormat("fa-IR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(startAt);
  return `${day} ساعت ${time}`;
}

/** SMS to a customer about their appointment. */
export function appointmentSmsText(kind: AppointmentSmsKind, a: AppointmentSmsInput): string {
  const at = when(a.startAt, a.timeZone);
  switch (kind) {
    case "booked":
      return `نوبت شما در ${a.salonName} برای ${at} با ${a.stylistName} ثبت شد.`;
    case "reminder":
      return `یادآوری: نوبت شما در ${a.salonName}، ${at} با ${a.stylistName}.`;
    case "cancelled":
      return `نوبت شما در ${a.salonName} برای ${at} لغو شد.`;
  }
}
