"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Last-resort boundary for render crashes anywhere in the app. Replaces the root layout while
// active, so it brings its own <html>/<body> and inline styles (globals.css isn't loaded here).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // An error with a digest came from the server and was already recorded by
    // instrumentation.ts (onRequestError) — only report crashes that happened in the browser.
    if (!error.digest) reportClientError({ error, kind: "render" });
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          background: "#f9fafb",
          color: "#111827",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>خطا</title>
        <h1 style={{ fontSize: 20, margin: 0 }}>مشکلی پیش آمد</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          خطا ثبت شد و بررسی می‌شود. لطفاً دوباره تلاش کنید.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: 8,
            border: 0,
            borderRadius: 999,
            padding: "10px 24px",
            background: "#a34a30",
            color: "white",
            fontSize: 14,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          تلاش دوباره
        </button>
      </body>
    </html>
  );
}
