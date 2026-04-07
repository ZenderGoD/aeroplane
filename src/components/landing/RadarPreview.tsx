"use client";

export default function RadarPreview() {
  return (
    <div className="relative w-full aspect-square max-w-[200px] mx-auto p-4">
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        {/* Concentric rings */}
        <circle cx="100" cy="100" r="90" stroke="rgba(203,213,225,0.1)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="65" stroke="rgba(203,213,225,0.08)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="40" stroke="rgba(203,213,225,0.06)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="15" stroke="rgba(203,213,225,0.05)" strokeWidth="0.5" />

        {/* Cross hairs */}
        <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(203,213,225,0.05)" strokeWidth="0.5" />
        <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(203,213,225,0.05)" strokeWidth="0.5" />

        {/* Sweep line */}
        <line x1="100" y1="100" x2="100" y2="10" stroke="rgba(203,213,225,0.4)" strokeWidth="1" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="4s"
            repeatCount="indefinite"
          />
        </line>

        {/* Sweep glow (arc) */}
        <path
          d="M 100 100 L 100 10 A 90 90 0 0 1 163.6 36.4 Z"
          fill="url(#sweep-gradient)"
          opacity="0.15"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>

        {/* Gradient definition for sweep */}
        <defs>
          <radialGradient id="sweep-gradient" cx="100" cy="100" r="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(203,213,225,0)" />
            <stop offset="100%" stopColor="rgba(203,213,225,0.3)" />
          </radialGradient>
        </defs>

        {/* Aircraft dots */}
        <circle cx="130" cy="60" r="3" fill="#cbd5e1">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="70" cy="80" r="2.5" fill="#cbd5e1">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="130" r="2" fill="#cbd5e1">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="55" cy="140" r="2.5" fill="#94a3b8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="110" cy="95" r="2" fill="#cbd5e1">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
        </circle>

        {/* Center dot (airport) */}
        <circle cx="100" cy="100" r="3" fill="rgba(203,213,225,0.8)" />
        <circle cx="100" cy="100" r="6" fill="none" stroke="rgba(203,213,225,0.3)" strokeWidth="0.5">
          <animate attributeName="r" values="3;8;3" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
