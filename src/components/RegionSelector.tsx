"use client";

import { REGIONS, REGION_KEYS } from "@/lib/regions";

interface Props {
  value: string;
  onChange: (regionKey: string) => void;
}

export default function RegionSelector({ value, onChange }: Props) {
  return (
    <div className="absolute top-4 left-80 z-[1000]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-gray-900/90 backdrop-blur shadow-lg border border-gray-700 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {REGION_KEYS.map((key) => (
          <option key={key} value={key}>
            {REGIONS[key].name}
          </option>
        ))}
      </select>
    </div>
  );
}
