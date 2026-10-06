import type { CSSProperties } from "react";

/** Staggered entrance: `<div className="g-rise" style={rise(2)}>` starts 70ms after rise(1). */
export const rise = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;
