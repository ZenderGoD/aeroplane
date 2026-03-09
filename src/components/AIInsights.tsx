"use client";

import { useState } from "react";

interface Props {
  narration: string | null;
  isLoading: boolean;
  error: boolean;
}

export default function AIInsights({ narration, isLoading, error }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no narration and not loading
  if (!narration && !isLoading && !error) return null;

  return (
    <div className="border border-purple-500/30 rounded-lg overflow-hidden bg-purple-950/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-950/30 transition-colors"
      >
        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex-1">
          AI Insights
        </span>
        <svg
          className={`w-3 h-3 text-purple-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          {isLoading && (
            <div className="space-y-2">
              <div className="h-3 bg-purple-900/40 rounded animate-pulse w-full" />
              <div className="h-3 bg-purple-900/40 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-purple-900/40 rounded animate-pulse w-4/6" />
            </div>
          )}

          {error && !isLoading && (
            <div className="text-xs text-gray-500 italic">
              Could not generate AI insights. Check API key configuration.
            </div>
          )}

          {narration && !isLoading && (
            <p className="text-xs text-gray-300 leading-relaxed">
              {narration}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
