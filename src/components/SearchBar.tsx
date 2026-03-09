"use client";

import { useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isAISearching?: boolean;
  isNaturalLanguage?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  isAISearching = false,
  isNaturalLanguage = false,
}: Props) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => onChange(input), 300);
    return () => clearTimeout(timer);
  }, [input, onChange]);

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="relative">
        {isAISearching ? (
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
              isNaturalLanguage ? "text-purple-400" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isNaturalLanguage ? (
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            )}
          </svg>
        )}
        <input
          type="text"
          placeholder='Search flights... (try "planes above 30000 ft")'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`pl-10 pr-8 py-2 w-80 rounded-lg bg-gray-900/90 backdrop-blur shadow-lg border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 ${
            isNaturalLanguage
              ? "border-purple-500/50 focus:ring-purple-500"
              : "border-gray-700 focus:ring-blue-500"
          }`}
        />
        {input && (
          <button
            onClick={() => {
              setInput("");
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {isNaturalLanguage && !isAISearching && (
        <div className="mt-1 ml-1 flex items-center gap-1">
          <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="text-[10px] text-purple-400 font-medium">AI-powered search</span>
        </div>
      )}
    </div>
  );
}
