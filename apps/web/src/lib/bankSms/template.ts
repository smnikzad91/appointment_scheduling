// Bank deposit SMS templates (set per platform card in /admin/finance): the admin pastes a real
// deposit SMS and replaces its values with {amount} (required, in rial), {balance}, {card},
// {date}, {time} and {*} (any text). No path aliases here, so `node --test` runs it as is.

export const TEMPLATE_FIELDS = ["amount", "balance", "card", "date", "time"] as const;
type Field = (typeof TEMPLATE_FIELDS)[number];

export interface ParsedSms {
  amountRial: bigint;
  balanceRial: bigint | null;
  card: string | null;
  date: string | null;
  time: string | null;
}

/** Persian/Arabic digits → Latin, Arabic ي/ك → Persian ی/ک, half-spaces and bidi marks removed, \r\n → \n. */
export function normalizeText(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‍‎‏‪-‮⁦-⁩]/g, "")
    .replace(/\r\n?/g, "\n");
}

/** "1,250,000" / "1.250.000" / "۱٬۲۵۰٬۰۰۰" → BigInt(1250000); null if no digits. Bank SMS amounts have no decimals. */
export function parseAmount(raw: string): bigint | null {
  const digits = normalizeText(raw).replace(/[^\d]/g, "");
  return digits ? BigInt(digits) : null;
}

const TOKEN = /\{(amount|balance|card|date|time|\*)\}/g;
const NUMBER = "([\\d,٬،.]+)";
const PATTERN: Record<Field | "*", string> = {
  amount: NUMBER,
  balance: NUMBER,
  card: "([\\d*xX\\-]+)",
  date: "([\\d/\\-.]+)",
  time: "([\\d:]+)",
  "*": "([\\s\\S]*?)",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface CompiledTemplate {
  regex: RegExp;
  fields: (Field | "*")[];
}

/** The template as a regex: literal text matches exactly (any whitespace ↔ any whitespace, also none). */
export function compileTemplate(template: string): CompiledTemplate {
  const t = normalizeText(template).trim();
  if (!t.includes("{amount}")) throw new Error("قالب پیامک باید {amount} (مبلغ واریز) را داشته باشد");
  const fields: (Field | "*")[] = [];
  let source = "";
  let last = 0;
  for (const m of t.matchAll(TOKEN)) {
    source += literal(t.slice(last, m.index));
    const f = m[1] as Field | "*";
    if (f !== "*" && fields.includes(f)) throw new Error(`{${f}} فقط یک بار می‌تواند در قالب بیاید`);
    fields.push(f);
    source += PATTERN[f];
    last = m.index! + m[0].length;
  }
  source += literal(t.slice(last));
  return { regex: new RegExp(source), fields };
}

function literal(s: string): string {
  // whitespace runs are flexible (banks vary line breaks/spaces); everything else is exact
  return s.split(/\s+/).map(escape).join("\\s*");
}

/** The values of a deposit SMS, or null when it doesn't fit the template (another kind of SMS). */
export function parseSms(template: string | CompiledTemplate, body: string): ParsedSms | null {
  const { regex, fields } = typeof template === "string" ? compileTemplate(template) : template;
  const m = regex.exec(normalizeText(body));
  if (!m) return null;
  const value = (f: Field) => {
    const i = fields.indexOf(f);
    return i < 0 ? null : m[i + 1];
  };
  const amountRial = parseAmount(value("amount") ?? "");
  if (amountRial === null || amountRial <= BigInt(0)) return null;
  const balance = value("balance");
  return { amountRial, balanceRial: balance ? parseAmount(balance) : null, card: value("card"), date: value("date"), time: value("time") };
}

/** "BankMellat" / "+98 999 123" / "0999123" → a comparable form: lowercase letters, or the number without +98/0098/98/0. */
export function normalizeSender(s: string): string {
  const t = normalizeText(s).trim().toLowerCase().replace(/\s+/g, "");
  if (/^\+?[\d-]+$/.test(t)) return t.replace(/[^\d]/g, "").replace(/^(0098|98|0)/, "");
  return t;
}

/** A random 1–1000 rial on top of the amount that no pending top-up on the card uses yet. */
export function pickOffsetRial(baseRial: bigint, taken: Set<bigint>, random: () => number = Math.random): number {
  const free: number[] = [];
  for (let o = 1; o <= 1000; o++) if (!taken.has(baseRial + BigInt(o))) free.push(o);
  if (free.length === 0) throw new Error("NO_FREE_AMOUNT");
  return free[Math.floor(random() * free.length)];
}
