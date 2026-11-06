"use client";

/**
 * POST a FormData with upload progress (fetch can't report it). Resolves with the HTTP status and the
 * parsed JSON body ({} when the body isn't JSON, e.g. nginx's 413 page). Rejects on network error / abort.
 */
export function uploadWithProgress<T = Record<string, unknown>>(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ status: number; ok: boolean; data: Partial<T> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: Partial<T> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data });
    };
    xhr.onerror = () => reject(new Error("اتصال قطع شد؛ دوباره امتحان کنید."));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}
