export interface IcsEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes: number;
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcsFile(event: IcsEventInput): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//salon-booking//fa",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@salon-booking`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
