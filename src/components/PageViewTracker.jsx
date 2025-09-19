import { useEffect } from "react";

export default function PageViewTracker({ page }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [page]);

  return null;
}
