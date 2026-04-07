"use client";

import { useState } from "react";

interface Props {
  narration: string | null;
  isLoading: boolean;
  error: boolean;
  onGenerate: () => void;
  remainingToday: number;
  dailyLimit: number;
}

export default function AIInsights({
  narration,
  isLoading,
  error,
  onGenerate,
  remainingToday,
  dailyLimit,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isExhausted = remainingToday <= 0;

  return (
    <div className="border border-slate-500/30 rounded-lg overflow-hidden bg-neutral-950/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-950/30 transition-colors"
      >
        <svg
          className="w-4 h-4 text-slate-400 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex-1">
          AI Insights
        </span>
        <span className="text-[10px] text-slate-500 tabular-nums mr-1">
          {remainingToday}/{dailyLimit}
        </span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/40 rounded animate-pulse w-full" />
              <div className="h-3 bg-slate-800/40 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-slate-800/40 rounded animate-pulse w-4/6" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="text-xs text-gray-500 italic">
              Could not generate AI insights. Check API key configuration.
            </div>
          )}

          {/* Result */}
          {narration && !isLoading && (
            <p className="text-xs text-gray-300 leading-relaxed">{narration}</p>
          )}

          {/* Generate button — shown when no narration and not loading */}
          {!narration && !isLoading && !error && (
            <div className="flex flex-col items-center gap-2 py-1">
              {isExhausted ? (
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Daily limit reached ({dailyLimit}/{dailyLimit} used)
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Resets at midnight
                  </p>
                </div>
              ) : (
                <button
                  onClick={onGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-500/40 rounded-md text-xs text-slate-300 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate Insight
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
