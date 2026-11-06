import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<>«»"']+[^\s<>«»"'.,،؛!?)])/g;

/** Plain text with its http(s) links clickable (chat bubbles; quick replies carry Help Center links). */
export function linkify(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all underline underline-offset-2" dir="ltr">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
