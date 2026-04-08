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
          <div className="flex items-center gap-5">
            <a href="#capabilities" className="hidden sm:block text-sm text-white/40 hover:text-white transition-colors">Capabilities</a>
            <a href="#data" className="hidden sm:block text-sm text-white/40 hover:text-white transition-colors">Data</a>
            <a href="#built-for" className="hidden sm:block text-sm text-white/40 hover:text-white transition-colors">For Schools</a>
            <AuthModal />
            <a
              href="/tracker"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
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

          <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[1.05] tracking-tight mb-6">
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
              <div className="relative w-full bg-[#0a0a0a]" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src="/embed"
                  title="AeroIntel flight tracker preview"
                  className="w-full h-full border-0 pointer-events-none"
                  loading="lazy"
                />
                {/* Bottom gradient fade so it blends into the page */}
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
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl">
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
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-6 max-w-3xl">
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
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-16 max-w-4xl">
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
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              Ready for takeoff.
            </h2>
            <p className="text-lg text-white/35 mb-10 max-w-xl mx-auto leading-relaxed">
              Free to use. No account required. Open the tracker and see
              your airspace in seconds.
            </p>
            <a
              href="/tracker"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-black font-semibold hover:shadow-[0_0_48px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-[1.02]"
            >
              Open Flight Tracker
              <ArrowRight size={18} />
            </a>
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
          </div>
          <p className="text-xs text-white/15">Data from airplanes.live &amp; NOAA</p>
        </div>
      </footer>
    </div>
  );
}
