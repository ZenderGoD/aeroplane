"use client";

interface Props {
  total: number;
  filtered: number;
  isFiltered: boolean;
  isRefreshing: boolean;
  isRateLimited?: boolean;
  lastUpdated: Date | null;
  inline?: boolean;
}

export default function FlightCounter({
  total,
  filtered,
  isFiltered,
  isRefreshing,
  isRateLimited,
  lastUpdated,
  inline = false,
}: Props) {
  const statusColor = isRateLimited
    ? "bg-slate-400 animate-pulse"
    : isRefreshing
      ? "bg-slate-400 animate-pulse"
      : "bg-slate-300";

  return (
    <div className={inline
      ? "px-1 py-1 text-sm"
      : "absolute top-4 right-4 z-[1000] bg-gray-900/90 backdrop-blur shadow-lg border border-gray-700 rounded-lg px-4 py-2 text-sm"
    }>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
        <span className="font-semibold text-gray-100">
          {isFiltered
            ? `${filtered.toLocaleString()} / ${total.toLocaleString()}`
            : total.toLocaleString()}{" "}
          flights
        </span>
      </div>
      {lastUpdated && (
        <div className="text-xs text-gray-500 mt-0.5">
          Updated {lastUpdated.toLocaleTimeString()}
          {isRateLimited && " (cached)"}
        </div>
      )}
    </div>
  );
}
