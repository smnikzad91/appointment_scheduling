import { Transform } from "class-transformer";

/**
 * An Iranian mobile as staff may type it — «09121234567», «+989121234567», «00989121234567»,
 * «989121234567», Persian digits, spaces or dashes — as the stored form «09121234567». Anything else
 * comes back digit-normalized and unchanged, for validation to reject.
 */
export function normalizeIranianMobile(input: string): string {
  const s = input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\s\-()]/g, "");
  const m = /^(?:\+98|0098|98)(9\d{9})$/.exec(s);
  return m ? `0${m[1]}` : s;
}

/** DTO field decorator: normalizes the phone before @Matches(/^09\d{9}$/) checks it. */
export const ToIranianMobile = () => Transform(({ value }) => (typeof value === "string" ? normalizeIranianMobile(value) : value));
