import { compileTemplate } from "./template";

/** Both, and a template that compiles; null when fine. */
export function checkSmsSettings(sender: string | null, template: string | null): string | null {
  // Required: a card's payments are confirmed only by its deposit SMS (no manual receipts any more).
  if (!sender || !template) return "فرستنده و قالب پیامک واریز کارت را وارد کنید";
  try {
    compileTemplate(template);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}
