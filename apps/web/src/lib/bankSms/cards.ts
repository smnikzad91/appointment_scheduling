import { compileTemplate } from "./template";

/** Both or neither, and a template that compiles; null when fine. */
export function checkSmsSettings(sender: string | null, template: string | null): string | null {
  if (!sender && !template) return null;
  if (!sender || !template) return "فرستنده و قالب پیامک واریز را با هم وارد کنید";
  try {
    compileTemplate(template);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}
