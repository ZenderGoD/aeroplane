"use client";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--surface-0) 95%, transparent)' }}>
      <div className="text-center animate-fade-in">
        {/* Radar-style spinner */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border border-slate-400/20" />
          {/* Middle ring */}
          <div className="absolute inset-2 rounded-full border border-slate-400/10" />
          {/* Inner ring */}
          <div className="absolute inset-4 rounded-full border border-slate-400/10" />
          {/* Sweep line */}
          <div className="absolute inset-0 animate-radar">
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
              style={{
                background: "linear-gradient(90deg, rgba(203, 213, 225, 0.8), transparent)",
              }}
            />
          </div>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.5)]" />
          </div>
          {/* Blip dots */}
          <div className="absolute top-3 right-5 w-1 h-1 rounded-full bg-slate-300/60 animate-pulse" />
          <div className="absolute bottom-5 left-4 w-1 h-1 rounded-full bg-slate-300/40 animate-pulse [animation-delay:0.5s]" />
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent">
            AeroIntel
          </span>
        </div>

        {message && (
          <p className="text-sm animate-pulse" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
        )}
      </div>
    </div>
  );
}
