"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

/** Reports uncaught browser errors and unhandled promise rejections to error_logs. Renders nothing. */
export default function ClientErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      // Errors from cross-origin scripts arrive as a bare "Script error." with no detail — skip them.
      if (!event.error && event.message === "Script error.") return;
      reportClientError({ error: event.error ?? event.message, kind: "error" });
    }

    function onRejection(event: PromiseRejectionEvent) {
      reportClientError({ error: event.reason, kind: "unhandledrejection" });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
