import type { ReactNode } from "react";
import { toast } from "sonner";

/**
 * Every error message after an action (save, send, validation) is a toast at the top of the screen
 * that goes away by itself — in a bottom sheet or a long form, a message at the end sits
 * off-screen below the button just tapped. Page-load failures keep their inline <ErrorBanner
 * onRetry> instead: they stand in for the content that didn't load.
 */
export function toastError(message: ReactNode) {
  toast.error(message, { position: "top-center", duration: 4000 });
}
