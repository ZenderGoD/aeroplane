import { Plane, ArrowRight, Radio, MapPin, Cloud, Wind, BarChart3, Shield } from "lucide-react";
import LiveFlightCount from "@/components/landing/LiveFlightCount";
import HeroBackground from "@/components/landing/HeroBackground";
import ScrollAnimator from "@/components/landing/ScrollAnimator";
import AuthModal from "@/components/landing/AuthModal";

/* ────────────────────────────────────────────────────────────
   LANDING PAGE — Clean editorial, aviation-themed
   ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-white/10">

      {/* ═══ NAV ═══════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(5,5,5,0.8)] backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <Plane size={18} className="text-white/70 -rotate-45 group-hover:text-white transition-colors" />
            <span className="font-semibold tracking-tight">
              Aero<span className="text-white/50">Intel</span>
            </span>
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="#capabilities" className="hidden lg:block text-sm text-white/40 hover:text-white transition-colors">Capabilities</a>
            <a href="#data" className="hidden lg:block text-sm text-white/40 hover:text-white transition-colors">Data</a>
            <a href="#built-for" className="hidden lg:block text-sm text-white/40 hover:text-white transition-colors">For Schools</a>
            <div className="hidden sm:block">
              <AuthModal />
            </div>
            <a
              href="/tracker"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Open Tracker
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ══════════════════════════════════════════════ */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 pt-14">
        <HeroBackground />

        {/* Runway center line — decorative */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-px h-[30vh] bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Live badge */}
          <div className="mb-10">
            <LiveFlightCount />
          </div>

          <h1 className="text-[clamp(2rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight mb-6">
            <span className="block">See every aircraft</span>
            <span className="block text-white/30">in real time.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/40 max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Aviation intelligence for training schools. Live ADS-B tracking,
            weather, METAR, and airport radar — all in one platform.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="/tracker"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-[1.02]"
            >
              Launch Platform
              <ArrowRight size={16} />
            </a>
            <a
              href="#capabilities"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/10 text-white/60 font-medium text-sm hover:text-white hover:border-white/25 transition-all duration-300"
            >
              See what it does
            </a>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-[1]" />

        {/* Runway threshold marks — decorative bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-[2]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1 h-8 bg-white/[0.06] rounded-full" />
          ))}
        </div>
      </section>

      {/* ═══ SCREENSHOT ════════════════════════════════════════ */}
      <section className="relative px-6 -mt-20 z-10 pb-32">
        <ScrollAnimator>
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)]">
              <div className="bg-[#0a0a0a] px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-xs text-white/20 font-mono ml-2">anuragair.com/tracker</span>
              </div>
              {/* Static tracker mockup — no iframe, no runtime errors */}
              <div className="relative w-full bg-[#080a10] overflow-hidden" style={{ aspectRatio: "16/9" }}>
                {/* Map grid */}
                <div className="absolute inset-0" style={{
                  backgroundImage: "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)",
                  backgroundSize: "60px 60px"
                }} />

                {/* Simulated map labels */}
                <span className="absolute top-[15%] left-[10%] text-[10px] font-mono text-white/10 tracking-wider">RAJASTHAN</span>
                <span className="absolute top-[25%] left-[45%] text-[10px] font-mono text-white/10 tracking-wider">DELHI NCR</span>
                <span className="absolute top-[40%] right-[15%] text-[10px] font-mono text-white/10 tracking-wider">UTTAR PRADESH</span>
                <span className="absolute bottom-[30%] left-[25%] text-[10px] font-mono text-white/10 tracking-wider">MADHYA PRADESH</span>
                <span className="absolute top-[10%] right-[25%] text-[10px] font-mono text-white/10 tracking-wider">HARYANA</span>

                {/* Aircraft dots */}
                {[
                  { x: "30%", y: "22%", rot: 45 }, { x: "48%", y: "28%", rot: 120 },
                  { x: "52%", y: "32%", rot: 200 }, { x: "45%", y: "35%", rot: 80 },
                  { x: "55%", y: "25%", rot: 310 }, { x: "42%", y: "40%", rot: 155 },
                  { x: "38%", y: "30%", rot: 270 }, { x: "60%", y: "38%", rot: 20 },
                  { x: "35%", y: "45%", rot: 190 }, { x: "50%", y: "18%", rot: 90 },
                  { x: "25%", y: "55%", rot: 340 }, { x: "65%", y: "20%", rot: 145 },
                  { x: "20%", y: "35%", rot: 60 }, { x: "70%", y: "45%", rot: 230 },
                  { x: "58%", y: "50%", rot: 15 }, { x: "40%", y: "20%", rot: 280 },
                  { x: "33%", y: "60%", rot: 110 }, { x: "72%", y: "30%", rot: 350 },
                ].map((p, i) => (
                  <div key={i} className="absolute" style={{ left: p.x, top: p.y }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform: `rotate(${p.rot}deg)`, filter: `drop-shadow(0 0 4px rgba(203,213,225,0.4))` }}>
                      <path d="M12 2L8 10H3L5 13H8L10 22H14L12 13H15L17 13H21L19 10H16L12 2Z" fill="rgba(203,213,225,0.7)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"/>
                    </svg>
                  </div>
                ))}

                {/* Sidebar mockup */}
                <div className="absolute left-0 top-0 bottom-0 w-[180px] bg-[rgba(5,5,5,0.85)] border-r border-white/[0.06] p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Plane size={10} className="text-white/40 -rotate-45" />
                    <span className="text-[10px] font-semibold text-white/50">AeroIntel</span>
                    <span className="ml-auto text-[8px] text-green-400/60">● LIVE</span>
                  </div>
                  <div className="w-full h-5 rounded bg-white/[0.04] border border-white/[0.06] mb-3" />
                  <div className="space-y-1.5">
                    {["Normal", "Heatmap", "Trails", "Airport", "FIDS", "Fleet"].map((m) => (
                      <div key={m} className={`px-2 py-1 rounded text-[8px] ${m === "Normal" ? "bg-white/[0.08] text-white/60" : "text-white/25"}`}>{m}</div>
                    ))}
                  </div>
                </div>

                {/* Stats badge mockup */}
                <div className="absolute top-3 right-3 bg-[rgba(5,5,5,0.8)] border border-white/[0.08] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                    <span className="text-[9px] text-white/30 font-mono">TRACKING</span>
                  </div>
                  <span className="text-xl font-bold text-white/60 font-mono">247</span>
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
              </div>
            </div>
          </div>
        </ScrollAnimator>
      </section>

      {/* ═══ CAPABILITIES ══════════════════════════════════════ */}
      <section id="capabilities" className="px-6 py-32">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator>
            <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] mb-6 max-w-3xl">
              Built for the people who <span className="text-white/30">teach people to fly.</span>
            </h2>
            <p className="text-lg text-white/35 max-w-2xl leading-relaxed mb-20">
              Every feature designed for training schools — from monitoring student
              solo flights to briefing weather before a cross-country.
            </p>
          </ScrollAnimator>

          {/* Feature rows — no cards, just type and lines */}
          <div className="space-y-0">
            {[
              {
                icon: <Radio size={20} />,
                title: "Live ADS-B Tracking",
                description: "Track every aircraft in your airspace with real-time ADS-B data from 30,000+ ground receivers worldwide. See altitude, speed, heading, and vertical rate — updated every 30 seconds.",
              },
              {
                icon: <MapPin size={20} />,
                title: "Airport Radar Mode",
                description: "Your airport, front and center. Range rings, bearing lines, approach corridors, and a flight list — everything an instructor needs to monitor the pattern from the ground.",
              },
              {
                icon: <Cloud size={20} />,
                title: "Weather & METAR",
                description: "NOAA METAR observations, precipitation overlays, wind layers, and ceiling data pulled live from aviationweather.gov. The same data your students brief with, right on the map.",
              },
              {
                icon: <BarChart3 size={20} />,
                title: "FIDS & Flight Board",
                description: "Real-time arrivals and departures board for any airport. Filter by airline, sort by time, and see which aircraft are on approach, departed, or taxiing.",
              },
              {
                icon: <Wind size={20} />,
                title: "Winds & Turbulence",
                description: "Upper-level wind analysis from FL100 to FL450, plus turbulence detection inferred from ADS-B vertical rate anomalies. Know the ride before your students take off.",
              },
              {
                icon: <Shield size={20} />,
                title: "Fleet Tracking",
                description: "Track your school's aircraft by callsign prefix or registration. See every training flight at a glance — who's in the pattern, who's on a cross-country, who just landed.",
              },
            ].map((feature, i) => (
              <ScrollAnimator key={i} delay={i * 40}>
                <div className="group grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-12 py-10 border-t border-white/[0.06] first:border-t-0">
                  <div className="flex items-start gap-3 text-white/30 group-hover:text-white/60 transition-colors">
                    {feature.icon}
                    <span className="text-sm font-semibold uppercase tracking-wider">{feature.title}</span>
                  </div>
                  <p className="text-base sm:text-lg text-white/40 leading-relaxed max-w-2xl group-hover:text-white/55 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </ScrollAnimator>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DATA SOURCES ══════════════════════════════════════ */}
      <section id="data" className="px-6 py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator>
            <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-4">Data</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] mb-6 max-w-3xl">
              Real data from <span className="text-white/30">real infrastructure.</span>
            </h2>
            <p className="text-lg text-white/35 max-w-2xl leading-relaxed mb-16">
              No synthetic feeds. Every data point comes from established aviation
              data networks — the same sources airlines and ATC rely on.
            </p>
          </ScrollAnimator>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-12">
            {[
              { name: "airplanes.live", detail: "ADS-B aggregation from 30,000+ volunteer receivers" },
              { name: "NOAA / aviationweather.gov", detail: "METAR, TAF, and surface weather observations" },
              { name: "ADS-B Exchange Network", detail: "Unfiltered ADS-B with military and government aircraft" },
              { name: "OpenStreetMap + Stadia", detail: "9 map styles including satellite and topographic" },
              { name: "FAA / ICAO databases", detail: "Airport, runway, and aircraft type reference data" },
              { name: "Pilot reports (PIREPs)", detail: "Turbulence, icing, and visibility from actual pilots" },
            ].map((source, i) => (
              <ScrollAnimator key={i} delay={i * 60}>
                <div className="group">
                  <p className="text-sm font-semibold text-white/60 group-hover:text-white/80 transition-colors mb-1">
                    {source.name}
                  </p>
                  <p className="text-sm text-white/25 leading-relaxed">
                    {source.detail}
                  </p>
                </div>
              </ScrollAnimator>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUILT FOR SCHOOLS ═════════════════════════════════ */}
      <section id="built-for" className="px-6 py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator>
            <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-4">For Training Schools</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] mb-16 max-w-4xl">
              Your students are in the air.<br />
              <span className="text-white/30">Know exactly where.</span>
            </h2>
          </ScrollAnimator>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-16">
            <ScrollAnimator delay={0}>
              <h3 className="text-lg font-semibold text-white/70 mb-3">Monitor solo flights</h3>
              <p className="text-base text-white/30 leading-relaxed">
                Track your student&apos;s first solo from the flight school office. See their
                altitude, pattern position, and ground speed in real time. Know the
                moment they touch down.
              </p>
            </ScrollAnimator>

            <ScrollAnimator delay={80}>
              <h3 className="text-lg font-semibold text-white/70 mb-3">Brief weather visually</h3>
              <p className="text-base text-white/30 leading-relaxed">
                Pull up METAR, winds aloft, and precipitation overlays on one screen
                during pre-flight briefings. Students see the actual conditions mapped,
                not just raw text.
              </p>
            </ScrollAnimator>

            <ScrollAnimator delay={160}>
              <h3 className="text-lg font-semibold text-white/70 mb-3">Track your fleet</h3>
              <p className="text-base text-white/30 leading-relaxed">
                Filter by your school&apos;s callsign prefix to see every training aircraft
                at a glance. Who&apos;s in the pattern, who&apos;s outbound on a cross-country,
                who just landed.
              </p>
            </ScrollAnimator>

            <ScrollAnimator delay={240}>
              <h3 className="text-lg font-semibold text-white/70 mb-3">Put it on the big screen</h3>
              <p className="text-base text-white/30 leading-relaxed">
                Mount a display in dispatch or the student lounge showing your airport&apos;s
                radar view. Live traffic, weather, and the FIDS board running all day —
                built to stay on.
              </p>
            </ScrollAnimator>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═════════════════════════════════════════ */}
      <section className="px-6 py-20 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between gap-8">
          {[
            { value: "30,000+", label: "ADS-B receivers" },
            { value: "9", label: "Map styles" },
            { value: "13", label: "View modes" },
            { value: "15", label: "Data overlays" },
          ].map((stat) => (
            <div key={stat.label} className="text-center flex-1 min-w-[120px]">
              <p className="text-3xl sm:text-4xl font-bold text-white/70 mb-1">{stat.value}</p>
              <p className="text-sm text-white/25">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═════════════════════════════════════════ */}
      <section className="px-6 py-32 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollAnimator>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] mb-6">
              Ready for takeoff.
            </h2>
            <p className="text-lg text-white/35 mb-10 max-w-xl mx-auto leading-relaxed">
              Free to use. No account required. Open the tracker and see
              your airspace in seconds.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="/tracker"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-black font-semibold hover:shadow-[0_0_48px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-[1.02]"
              >
                Open Flight Tracker
                <ArrowRight size={18} />
              </a>
              <a
                href="https://discord.gg/kcqQ3mm2wp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/[0.1] text-white/50 font-medium hover:text-white hover:border-white/25 transition-all duration-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord
              </a>
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════ */}
      <footer className="px-6 py-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/25">
            <Plane size={14} className="-rotate-45" />
            <span className="text-sm">AeroIntel</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/tracker" className="text-sm text-white/20 hover:text-white/50 transition-colors">Tracker</a>
            <a href="/airport" className="text-sm text-white/20 hover:text-white/50 transition-colors">Airport</a>
            <a href="/embed" className="text-sm text-white/20 hover:text-white/50 transition-colors">Embed</a>
            <a
              href="https://discord.gg/kcqQ3mm2wp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/50 transition-colors"
              title="Join our Discord"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
          </div>
          <p className="text-xs text-white/15">Data from airplanes.live &amp; NOAA</p>
        </div>
      </footer>
    </div>
  );
}
