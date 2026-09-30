"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dropDraft, onBackground, saveDraft, takeDraft } from "@/lib/formDrafts";

// Keeps what the user typed on any page when the OS kills the installed app in the background
// (see lib/formDrafts.ts). Only fields the user actually edited, still on screen when the app went
// to the background, are kept — never passwords, one-time codes, files or anything marked
// data-no-draft. After the reload they're put back as if typed, so React state follows.

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Saved = Record<string, string | boolean>;

/** How long after a load the fields may still appear (data loading, a step rendering). */
const RESTORE_WINDOW_MS = 15_000;
const SKIP_TYPES = new Set(["password", "hidden", "file", "submit", "button", "reset", "image"]);

function eligible(el: Element): el is Field {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return false;
  if (el.disabled || el.closest("[data-no-draft]")) return false;
  if (el instanceof HTMLInputElement && (SKIP_TYPES.has(el.type) || el.readOnly)) return false;
  return !/password|one-time-code|cc-/.test(el.getAttribute("autocomplete") ?? "");
}

/** A name for the field that survives a reload: its name/id/label, numbered among same-named ones. */
function fieldKeys(): Map<Field, string> {
  const keys = new Map<Field, string>();
  const seen = new Map<string, number>();
  for (const el of document.querySelectorAll("input, textarea, select")) {
    if (!eligible(el)) continue;
    const label = el.labels?.[0]?.textContent?.trim().slice(0, 40);
    let base = el.name || el.getAttribute("aria-label") || label || el.getAttribute("placeholder") || el.tagName;
    if (el instanceof HTMLInputElement && el.type === "radio") base += `=${el.value}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    keys.set(el, `${base}#${n}`);
  }
  return keys;
}

const valueOf = (el: Field) => (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? el.checked : el.value);

/** Sets the value the way typing would, so a controlled React input's onChange sees it. */
function put(el: Field, value: string | boolean) {
  if (typeof value === "boolean") {
    if (el instanceof HTMLInputElement && el.checked !== value) el.click();
    return;
  }
  if (el.value === value) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function FormDraftKeeper() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `fields:${pathname}${window.location.search}`;
    const edited = new WeakSet<Element>();
    const onEdit = (e: Event) => {
      if (e.isTrusted && e.target instanceof Element && eligible(e.target)) edited.add(e.target);
    };
    const save = () => {
      const data: Saved = {};
      for (const [el, name] of fieldKeys()) if (edited.has(el)) data[name] = valueOf(el);
      if (Object.keys(data).length) saveDraft(key, data);
      else dropDraft(key);
    };
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    const stopBackground = onBackground(save, () => dropDraft(key));

    // After a reload: put the draft back as its fields appear, each at most once.
    let pending = takeDraft<Saved>(key);
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restore = () => {
      if (!pending) return;
      for (const [el, name] of fieldKeys()) {
        if (!(name in pending)) continue;
        put(el, pending[name]);
        edited.add(el); // still the user's text: keep it if the app is backgrounded again
        delete pending[name];
      }
      if (!Object.keys(pending).length) stop();
    };
    const stop = () => {
      pending = null;
      observer?.disconnect();
      clearTimeout(timer);
    };
    if (pending) {
      restore();
      if (pending) {
        observer = new MutationObserver(restore);
        observer.observe(document.body, { childList: true, subtree: true });
        timer = setTimeout(stop, RESTORE_WINDOW_MS);
      }
    }

    return () => {
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      stopBackground();
      stop();
    };
  }, [pathname]);

  return null;
}
