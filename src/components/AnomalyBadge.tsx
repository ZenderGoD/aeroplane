"use client";

import type { Anomaly } from "@/types/anomaly";
import { ANOMALY_LABELS } from "@/types/anomaly";

interface Props {
  anomalies: Anomaly[];
}

const SEVERITY_STYLES = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

export default function AnomalyBadge({ anomalies }: Props) {
  if (anomalies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {anomalies.map((a, i) => (
        <span
          key={`${a.type}-${i}`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SEVERITY_STYLES[a.severity]} ${
            a.severity === "critical" ? "animate-anomaly-pulse" : ""
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {ANOMALY_LABELS[a.type]}
        </span>
      ))}
    </div>
  );
}
