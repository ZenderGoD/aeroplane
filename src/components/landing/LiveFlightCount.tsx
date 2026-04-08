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

    // Fetch once on mount — no polling on the landing page
    fetchCount();

    return () => {
      mounted = false;
    };
  }, []);

  if (error || count === null) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(203,213,225,0.1)] bg-[rgba(10,10,10,0.6)] backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-300" />
        </span>
        <span className="text-sm font-mono text-white/50">
          {error ? "Tracking live flights" : "Connecting..."}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(203,213,225,0.2)] bg-[rgba(203,213,225,0.06)] backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-300" />
      </span>
      <span className="text-sm font-mono text-slate-300">
        Currently tracking{" "}
        <span className="font-bold text-slate-200">{count.toLocaleString()}</span>{" "}
        flights
      </span>
    </div>
  );
}
