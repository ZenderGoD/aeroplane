"use client";

import type { Anomaly } from "@/types/anomaly";
import { ANOMALY_LABELS } from "@/types/anomaly";

interface Props {
  anomalies: Anomaly[];
}

const SEVERITY_STYLES = {
  critical: "bg-slate-200/20 text-slate-200 border-slate-200/40",
  warning: "bg-slate-400/20 text-slate-400 border-slate-400/40",
  info: "bg-slate-400/20 text-slate-400 border-slate-400/40",
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
