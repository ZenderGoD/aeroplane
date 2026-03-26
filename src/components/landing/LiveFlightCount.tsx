"use client";

import { useEffect, useState } from "react";

export default function LiveFlightCount() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const res = await fetch("/api/flights");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (mounted) {
          const total = Array.isArray(data) ? data.length : data?.flights?.length ?? data?.count ?? 0;
          setCount(total);
        }
      } catch {
        if (mounted) setError(true);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (error || count === null) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(148,163,184,0.1)] bg-[rgba(15,23,42,0.6)] backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {error ? "Tracking live flights" : "Connecting..."}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.06)] backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span className="text-sm font-mono text-emerald-400">
        Currently tracking{" "}
        <span className="font-bold text-emerald-300">{count.toLocaleString()}</span>{" "}
        flights
      </span>
    </div>
  );
}
