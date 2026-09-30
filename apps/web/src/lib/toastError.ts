import { toast } from "sonner";

/**
 * An error as a toast at the top of the screen that goes away by itself — for forms in a bottom
 * sheet, where a message at the end of the form sits off-screen below the button just tapped.
 */
export function toastError(message: string) {
  toast.error(message, { position: "top-center", duration: 4000 });
}
