"use client";

import { useEffect, useState } from "react";

/** Refresh on return/reconnection, not by polling or sending notifications. */
export function useReturnRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let last = 0;
    function refresh() {
      if (document.visibilityState !== "visible" || Date.now() - last < 1000) return;
      last = Date.now();
      setRevision((value) => value + 1);
    }
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return revision;
}
