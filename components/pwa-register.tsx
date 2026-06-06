"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    const shouldRegister =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV === "true";

    if (!("serviceWorker" in navigator) || !shouldRegister) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app still works if service-worker registration is unavailable.
    });
  }, []);

  return null;
}
