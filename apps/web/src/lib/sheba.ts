// Iranian Sheba (IBAN) numbers. No imports, so node --test can load it directly (sheba.test.ts).

/** "IR" + 24 digits with a valid ISO 13616 check (mod 97 = 1); returns the normalised form or null. */
export function normalizeSheba(input: string): string | null {
  const s = input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toUpperCase()
    .replace(/[\s-]/g, "");
  const sheba = /^\d{24}$/.test(s) ? `IR${s}` : s;
  if (!/^IR\d{24}$/.test(sheba)) return null;
  const rearranged = sheba.slice(4) + "1827" + sheba.slice(2, 4); // I=18, R=27
  let rest = 0;
  for (const ch of rearranged) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1 ? sheba : null;
}
