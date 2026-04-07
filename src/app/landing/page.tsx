import {
  Plane,
  Radar,
  Monitor,
  Users,
  FileSearch,
  Bot,
  BarChart3,
  GitCompare,
  Bell,
  CloudLightning,
  ShieldCheck,
  FileWarning,
  Satellite,
  Code2,
  FileCode,
  FileSpreadsheet,
  Radio,
  Globe2,
  Zap,
  Quote,
  Layers,
  Wind,
  Mountain,
  Map,
  Star,
  Twitter,
  Github,
  MessageCircle,
  Cloud,
  Activity,
} from "lucide-react";
import LiveFlightCount from "@/components/landing/LiveFlightCount";
import HeroBackground from "@/components/landing/HeroBackground";
import ScrollAnimator from "@/components/landing/ScrollAnimator";
import FeatureCard from "@/components/landing/FeatureCard";
import PricingCard from "@/components/landing/PricingCard";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import AuthModal from "@/components/landing/AuthModal";
import DataTicker from "@/components/landing/DataTicker";
import BentoFeatureCard from "@/components/landing/BentoFeatureCard";
import RadarPreview from "@/components/landing/RadarPreview";
import MapPreview from "@/components/landing/MapPreview";

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const smallFeatures = [
  { icon: <Monitor size={18} />, title: "FIDS Board", description: "Real-time arrivals and departures that mirror actual airport display screens." },
  { icon: <FileSearch size={18} />, title: "Aircraft Profiles", description: "Detailed dossier on any aircraft including registration, type, and operator." },
  { icon: <BarChart3 size={18} />, title: "Statistics Dashboard", description: "Real-time traffic analytics, trends, and operational performance metrics." },
  { icon: <GitCompare size={18} />, title: "Multi-Aircraft Compare", description: "Side-by-side analysis of flight parameters for any two aircraft." },
  { icon: <CloudLightning size={18} />, title: "Turbulence Map", description: "Live turbulence detection and pilot-reported conditions overlay." },
  { icon: <ShieldCheck size={18} />, title: "Airspace Boundaries", description: "FIR, TMA, restricted zones, and military airspace visualization." },
  { icon: <FileWarning size={18} />, title: "NOTAMs", description: "Active NOTAMs and Temporary Flight Restrictions mapped in real-time." },
  { icon: <Satellite size={18} />, title: "GPS Integrity", description: "Spoofing detection and ADS-B signal quality analysis for every flight." },
  { icon: <Code2 size={18} />, title: "Embeddable Widget", description: "Drop a live tracking widget onto any website with one line of code." },
  { icon: <FileCode size={18} />, title: "API Access", description: "Full-featured developer API for custom integrations and data pipelines." },
];

const comparisonData = [
  { feature: "Real-time tracking", aero: true, fr24Free: true, fr24Biz: true },
  { feature: "Military aircraft", aero: true, fr24Free: false, fr24Biz: true },
  { feature: "GPS integrity monitoring", aero: true, fr24Free: false, fr24Biz: false },
  { feature: "AI-powered search", aero: true, fr24Free: false, fr24Biz: false },
  { feature: "Custom alerts", aero: true, fr24Free: false, fr24Biz: true },
  { feature: "Embeddable widgets", aero: true, fr24Free: false, fr24Biz: true },
  { feature: "API access", aero: true, fr24Free: false, fr24Biz: true },
  { feature: "Turbulence map", aero: true, fr24Free: false, fr24Biz: false },
  { feature: "Airport radar mode", aero: true, fr24Free: false, fr24Biz: false },
  { feature: "Export & reports", aero: true, fr24Free: false, fr24Biz: true },
];

const testimonials = [
  {
    name: "Marcus Reilly",
    role: "Aviation Enthusiast",
    quote: "I've used every flight tracker out there. AeroIntel's GPS integrity monitoring and AI search are genuinely in a different league. The military tracking alone is worth it.",
    avatar: "MR",
  },
  {
    name: "Captain Sarah Chen",
    role: "Airline Operations Manager, Pacific Airways",
    quote: "Our dispatch team relies on AeroIntel for real-time fleet oversight. The corridor health analytics and turbulence overlays have directly improved our operational efficiency.",
    avatar: "SC",
  },
  {
    name: "David Okafor",
    role: "Airport Authority, MMIA Lagos",
    quote: "The airport radar mode with FIDS integration gives us a single pane of glass for traffic management. The API lets us pipe data into our internal systems effortlessly.",
    avatar: "DO",
  },
];

const dataLayers = [
  { icon: <Cloud size={20} />, name: "METAR Weather", description: "Surface weather observations from 7,000+ stations worldwide", color: "text-slate-300" },
  { icon: <Map size={20} />, name: "Airport Runways", description: "Active runway configurations, ILS approaches, and taxiway data", color: "text-slate-300" },
  { icon: <Activity size={20} />, name: "Route Density", description: "Traffic corridor heatmaps showing congestion patterns", color: "text-slate-400" },
  { icon: <Wind size={20} />, name: "Wind Aloft", description: "Upper-level wind analysis from FL100 to FL450", color: "text-slate-400" },
  { icon: <Mountain size={20} />, name: "Terrain", description: "High-resolution elevation data with CFIT warning zones", color: "text-slate-400" },
  { icon: <CloudLightning size={20} />, name: "PIREPs", description: "Pilot reports for turbulence, icing, and visibility", color: "text-slate-200" },
];

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] overflow-x-hidden">

      {/* ═══════════════════════ A. NAVIGATION ═══════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[rgba(6,8,13,0.7)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/landing" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,#94a3b8,#cbd5e1,#e2e8f0)] flex items-center justify-center shadow-[0_0_16px_rgba(148,163,184,0.3)]">
                <Plane size={16} className="text-white -rotate-45" />
              </div>
              <span className="font-semibold text-[var(--text-primary)] tracking-tight text-lg">
                Aero<span className="text-[var(--accent-primary)]">Intel</span>
              </span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
              <a href="#data" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Data</a>
              <a href="#compare" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Compare</a>
              <a href="#pricing" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AuthModal />
            <a
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[linear-gradient(135deg,#94a3b8,#cbd5e1)] text-white font-medium text-sm hover:shadow-[0_0_24px_rgba(148,163,184,0.4)] transition-all duration-300"
            >
              Launch Platform
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ B. HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <HeroBackground />

        {/* Top radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse,rgba(148,163,184,0.08)_0%,transparent_70%)] pointer-events-none" />

        {/* Bottom fade to surface */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-[linear-gradient(to_top,var(--surface-0),transparent)] pointer-events-none z-[1]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="mb-8">
            <LiveFlightCount />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]">
            <span className="block text-[var(--text-primary)]">The Aviation</span>
            <span
              className="block bg-[linear-gradient(135deg,#94a3b8_0%,#cbd5e1_50%,#e2e8f0_100%)] bg-clip-text text-transparent"
              style={{ backgroundSize: "200% 200%", animation: "gradient-shift 6s ease infinite" }}
            >
              Intelligence Platform
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[var(--text-tertiary)] max-w-2xl mx-auto mb-4 leading-relaxed font-light">
            Real-time tracking &bull; AI analytics &bull; Global coverage
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[linear-gradient(135deg,#94a3b8,#cbd5e1)] text-white font-semibold text-sm hover:shadow-[0_0_40px_rgba(148,163,184,0.35)] transition-all duration-300 hover:scale-[1.02]"
            >
              Open Flight Map
              <span className="text-base">&rarr;</span>
            </a>
            <a
              href="/api/flights"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--surface-2)] hover:border-[var(--accent-primary)] transition-all duration-300"
            >
              Explore API
            </a>
          </div>

          {/* Powered by badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
            {["ADS-B", "MLAT", "airplanes.live", "NOAA", "aviationweather.gov"].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 rounded-full text-[10px] font-mono font-medium text-[var(--text-faint)] border border-[var(--border-subtle)] bg-[rgba(10,10,10,0.5)]"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Mock screenshot of the platform */}
          <ScrollAnimator>
            <div className="max-w-3xl mx-auto rounded-xl overflow-hidden border border-[var(--border-default)] shadow-[0_0_60px_rgba(148,163,184,0.08)] bg-[var(--surface-1)]">
              <MapPreview />
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ═══════════════════════ C. DATA TICKER ═══════════════════════ */}
      <div className="relative z-10">
        <DataTicker />
      </div>

      {/* ═══════════════════════ D. BENTO FEATURES ═══════════════════════ */}
      <section id="features" className="relative py-32 px-6">
        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.03)_0%,transparent_70%)]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.03)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-[var(--accent-primary)] border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.06)] mb-4 tracking-wider uppercase">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need for
              <br />
              aviation intelligence
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto text-lg">
              16 integrated tools working together to give you unmatched situational awareness.
            </p>
          </ScrollAnimator>

          {/* Bento grid - hero features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ScrollAnimator delay={0} className="sm:col-span-2">
              <BentoFeatureCard
                icon={<Plane size={18} />}
                title="Live Flight Map"
                description="Track every aircraft in real-time with ADS-B data across global airspace. Pan, zoom, and click any aircraft for full details."
                colSpan={2}
              >
                <MapPreview />
              </BentoFeatureCard>
            </ScrollAnimator>

            <ScrollAnimator delay={80}>
              <BentoFeatureCard
                icon={<Radar size={18} />}
                title="Airport Radar"
                description="Airport-centric radar with range rings and bearing tools for approach monitoring."
              >
                <RadarPreview />
              </BentoFeatureCard>
            </ScrollAnimator>

            <ScrollAnimator delay={120}>
              <BentoFeatureCard
                icon={<Bot size={18} />}
                title="AI Copilot"
                description="Natural language flight search and analysis powered by machine intelligence."
              >
                {/* Mini chat preview */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-[rgba(148,163,184,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={10} className="text-[var(--accent-primary)]" />
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.1)]">
                      <p className="text-[10px] text-[var(--text-secondary)]">Show me all Emirates A380s currently over Europe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-muted)]">Found 4 Emirates A388 aircraft over European airspace...</p>
                    </div>
                  </div>
                </div>
              </BentoFeatureCard>
            </ScrollAnimator>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <ScrollAnimator delay={160}>
              <BentoFeatureCard
                icon={<Users size={18} />}
                title="Fleet Tracker"
                description="Monitor entire airline fleets globally with full position history and utilization data."
              >
                {/* Mini airline list */}
                <div className="p-3 space-y-1.5">
                  {[
                    { code: "UAE", name: "Emirates", count: 287, color: "text-slate-400" },
                    { code: "SIA", name: "Singapore Airlines", count: 143, color: "text-slate-300" },
                    { code: "QFA", name: "Qantas", count: 198, color: "text-slate-200" },
                  ].map((airline) => (
                    <div key={airline.code} className="flex items-center justify-between px-2 py-1 rounded bg-[rgba(255,255,255,0.02)]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold ${airline.color}`}>{airline.code}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{airline.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-faint)]">{airline.count} active</span>
                    </div>
                  ))}
                </div>
              </BentoFeatureCard>
            </ScrollAnimator>

            <ScrollAnimator delay={200}>
              <BentoFeatureCard
                icon={<Bell size={18} />}
                title="Real-time Alerts"
                description="Custom alerts for aircraft movements, airspace events, squawk codes, and emergencies."
              >
                {/* Mini notification badges */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[rgba(226,232,240,0.06)] border border-[rgba(226,232,240,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
                    <span className="text-[10px] text-slate-200 font-mono">SQK 7700 - UAL2843 near KATL</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="text-[10px] text-slate-400 font-mono">Military activity - CZQX FIR</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] text-slate-300 font-mono">N172SP entered your watchlist zone</span>
                  </div>
                </div>
              </BentoFeatureCard>
            </ScrollAnimator>

            <ScrollAnimator delay={240} className="sm:col-span-2">
              <BentoFeatureCard
                icon={<Layers size={18} />}
                title="Data Layers"
                description="Toggle six real-time data overlays on any map view. METAR, PIREPs, winds, terrain, runways, and route density."
                colSpan={2}
              >
                {/* Data layer icons row */}
                <div className="p-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { icon: <Cloud size={14} />, label: "METAR", color: "text-slate-300" },
                    { icon: <CloudLightning size={14} />, label: "PIREPs", color: "text-slate-200" },
                    { icon: <Wind size={14} />, label: "Winds", color: "text-slate-400" },
                    { icon: <Mountain size={14} />, label: "Terrain", color: "text-slate-400" },
                    { icon: <Map size={14} />, label: "Runways", color: "text-slate-300" },
                    { icon: <Activity size={14} />, label: "Density", color: "text-slate-400" },
                  ].map((layer) => (
                    <div key={layer.label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                      <span className={layer.color}>{layer.icon}</span>
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">{layer.label}</span>
                    </div>
                  ))}
                </div>
              </BentoFeatureCard>
            </ScrollAnimator>
          </div>

          {/* Smaller feature cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {smallFeatures.map((feature, i) => (
              <ScrollAnimator key={feature.title} delay={i * 40}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  index={i}
                />
              </ScrollAnimator>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ E. DATA SECTION ═══════════════════════ */}
      <section id="data" className="relative py-32 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(203,213,225,0.04)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-slate-300 border border-[rgba(203,213,225,0.2)] bg-[rgba(203,213,225,0.06)] mb-4 tracking-wider uppercase">
              Data Sources
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Powered by Real Aviation Data
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto text-lg">
              Aggregating multiple aviation data feeds for comprehensive global coverage.
            </p>
          </ScrollAnimator>

          {/* Stats counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              { value: 40000, suffix: "+", label: "Aircraft Tracked Daily" },
              { value: 7000, suffix: "+", label: "Airports Worldwide" },
              { value: 6, suffix: "", label: "Real-time Data Layers" },
              { value: 3, suffix: "s", label: "Refresh Rate" },
            ].map((stat, i) => (
              <ScrollAnimator key={stat.label} delay={i * 100}>
                <div className="text-center p-8 rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(28,28,28,0.3)_0%,rgba(10,10,10,0.5)_100%)] backdrop-blur-sm">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  <p className="mt-3 text-sm text-[var(--text-tertiary)] font-medium">{stat.label}</p>
                </div>
              </ScrollAnimator>
            ))}
          </div>

          {/* Data layers detail */}
          <ScrollAnimator>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataLayers.map((layer) => (
                <div
                  key={layer.name}
                  className="flex items-start gap-4 p-5 rounded-xl border border-[var(--border-subtle)] bg-[rgba(10,10,10,0.4)] hover:border-[rgba(148,163,184,0.15)] transition-colors duration-300"
                >
                  <div className={`w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 ${layer.color}`}>
                    {layer.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{layer.name}</h4>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{layer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimator>

          {/* Data sources badges */}
          <ScrollAnimator className="mt-12">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {[
                { icon: <Radio size={16} />, name: "ADS-B Exchange" },
                { icon: <Satellite size={16} />, name: "MLAT Network" },
                { icon: <Globe2 size={16} />, name: "airplanes.live" },
                { icon: <Cloud size={16} />, name: "NOAA" },
                { icon: <Wind size={16} />, name: "aviationweather.gov" },
              ].map((source) => (
                <div
                  key={source.name}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-[var(--border-subtle)] bg-[rgba(10,10,10,0.5)] backdrop-blur-sm"
                >
                  <span className="text-[var(--text-muted)]">{source.icon}</span>
                  <span className="text-xs font-medium text-[var(--text-tertiary)]">{source.name}</span>
                </div>
              ))}
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ═══════════════════════ F. COMPARISON TABLE ═══════════════════════ */}
      <section id="compare" className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-slate-400 border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.06)] mb-4 tracking-wider uppercase">
              Comparison
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              AeroIntel vs Flightradar24
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto text-lg">
              See how AeroIntel stacks up against the industry incumbent.
            </p>
          </ScrollAnimator>

          <ScrollAnimator>
            <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--surface-1)]">
              {/* Table header */}
              <div className="grid grid-cols-4 gap-0 border-b border-[var(--border-default)]">
                <div className="p-5 text-sm font-semibold text-[var(--text-tertiary)]">Feature</div>
                <div className="p-5 text-sm font-semibold text-center bg-[linear-gradient(180deg,rgba(148,163,184,0.06)_0%,transparent_100%)]">
                  <span className="bg-[linear-gradient(135deg,#94a3b8,#cbd5e1)] bg-clip-text text-transparent">AeroIntel</span>
                </div>
                <div className="p-5 text-sm font-semibold text-[var(--text-muted)] text-center">FR24 Free</div>
                <div className="p-5 text-sm font-semibold text-[var(--text-muted)] text-center">FR24 Business</div>
              </div>
              {/* Table body */}
              {comparisonData.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-4 gap-0 ${
                    i < comparisonData.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                  } hover:bg-[var(--surface-2)] transition-colors`}
                >
                  <div className="p-4 text-sm text-[var(--text-secondary)]">{row.feature}</div>
                  <div className="p-4 text-center bg-[rgba(148,163,184,0.02)]">
                    <span className="text-slate-300 text-base font-bold">&#10003;</span>
                  </div>
                  <div className="p-4 text-center">
                    {row.fr24Free ? (
                      <span className="text-slate-300/60 text-base">&#10003;</span>
                    ) : (
                      <span className="text-slate-400/40 text-base">&#10005;</span>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    {row.fr24Biz ? (
                      <span className="text-slate-300/60 text-base">&#10003;</span>
                    ) : (
                      <span className="text-slate-400/40 text-base">&#10005;</span>
                    )}
                  </div>
                </div>
              ))}
              {/* Winner row */}
              <div className="grid grid-cols-4 gap-0 border-t border-[var(--border-default)] bg-[rgba(148,163,184,0.03)]">
                <div className="p-4 text-sm font-semibold text-[var(--text-primary)]">Score</div>
                <div className="p-4 text-center">
                  <span className="font-mono font-bold text-slate-300">10/10</span>
                </div>
                <div className="p-4 text-center">
                  <span className="font-mono font-bold text-[var(--text-muted)]">2/10</span>
                </div>
                <div className="p-4 text-center">
                  <span className="font-mono font-bold text-[var(--text-muted)]">6/10</span>
                </div>
              </div>
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ═══════════════════════ G. PRICING ═══════════════════════ */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.04)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-slate-400 border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.06)] mb-4 tracking-wider uppercase">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Choose your plan
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto text-lg">
              Start free. Upgrade when you need more power.
            </p>
          </ScrollAnimator>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollAnimator delay={0}>
              <PricingCard
                name="Free"
                price="$0"
                period="/mo"
                description="For aviation enthusiasts and casual tracking."
                features={[
                  "Live flight tracking",
                  "5 custom alerts",
                  "Basic search",
                  "Community support",
                  "Airport FIDS view",
                ]}
                cta="Get Started Free"
              />
            </ScrollAnimator>
            <ScrollAnimator delay={100}>
              <PricingCard
                name="Pro"
                price="$29"
                period="/mo"
                description="For professionals who need the full picture."
                features={[
                  "Everything in Free",
                  "Fleet tracker",
                  "Unlimited alerts",
                  "API access (10k/day)",
                  "Priority support",
                  "Export & reports",
                  "AI Copilot",
                ]}
                highlighted
                cta="Start Pro Trial"
              />
            </ScrollAnimator>
            <ScrollAnimator delay={200}>
              <PricingCard
                name="Enterprise"
                price="Custom"
                description="For organizations that need scale and SLAs."
                features={[
                  "Unlimited API access",
                  "Custom integrations",
                  "99.9% SLA",
                  "Dedicated support",
                  "White-label option",
                  "Custom data feeds",
                  "On-premise available",
                ]}
                cta="Contact Sales"
              />
            </ScrollAnimator>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ H. TESTIMONIALS ═══════════════════════ */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-slate-300 border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.06)] mb-4 tracking-wider uppercase">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Trusted by aviation professionals
            </h2>
          </ScrollAnimator>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollAnimator key={t.name} delay={i * 100}>
                <div className="relative p-8 rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(28,28,28,0.3)_0%,rgba(10,10,10,0.5)_100%)] h-full flex flex-col">
                  {/* Large quote mark */}
                  <div className="mb-4">
                    <Quote size={32} className="text-[var(--accent-primary)] opacity-20" />
                  </div>

                  {/* Star ratings */}
                  <div className="flex items-center gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={14} className="text-slate-400 fill-slate-400" />
                    ))}
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--border-subtle)]">
                    <div className="w-11 h-11 rounded-full bg-[linear-gradient(135deg,rgba(148,163,184,0.15),rgba(148,163,184,0.15))] border border-[var(--border-default)] flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--accent-primary)]">{t.avatar}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimator>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ I. CTA SECTION ═══════════════════════ */}
      <section className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollAnimator>
            <div
              className="relative p-16 rounded-3xl border border-[rgba(148,163,184,0.15)] overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0.08) 50%, rgba(226, 232, 240, 0.06) 100%)",
              }}
            >
              {/* Animated glow orbs */}
              <div className="absolute top-0 left-1/4 w-[300px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.12)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.1)_0%,transparent_70%)] pointer-events-none" />

              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
                  Ready to see every aircraft
                  <br />
                  on Earth?
                </h2>
                <p className="text-[var(--text-tertiary)] mb-8 max-w-lg mx-auto text-lg">
                  Join thousands of aviation professionals, enthusiasts, and organizations using AeroIntel every day.
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-[linear-gradient(135deg,#94a3b8,#cbd5e1)] text-white font-semibold text-base hover:shadow-[0_0_40px_rgba(148,163,184,0.4)] transition-all duration-300 hover:scale-[1.02]"
                >
                  Launch AeroIntel
                  <span>&rarr;</span>
                </a>
                <p className="mt-6 text-xs text-[var(--text-muted)]">
                  No credit card required &bull; Free forever plan available
                </p>
              </div>
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ═══════════════════════ J. FOOTER ═══════════════════════ */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-0)] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,#94a3b8,#cbd5e1,#e2e8f0)] flex items-center justify-center">
                  <Plane size={16} className="text-white -rotate-45" />
                </div>
                <span className="font-semibold text-[var(--text-primary)] tracking-tight text-lg">
                  Aero<span className="text-[var(--accent-primary)]">Intel</span>
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                Aviation intelligence for the modern world. Real-time tracking, AI analytics, and operational insights.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors">
                  <Twitter size={14} />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors">
                  <Github size={14} />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors">
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {["Live Map", "Fleet Tracker", "Airport Radar", "AI Copilot", "Turbulence Map"].map((link) => (
                  <li key={link}>
                    <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developer links */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Developers</h4>
              <ul className="space-y-2.5">
                {["API Documentation", "Embeddable Widget", "Status Page", "Changelog", "GitHub"].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["Pricing", "About", "Contact", "Privacy Policy", "Terms of Service"].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="divider-glow mb-8" />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-[var(--text-faint)]">
              &copy; {new Date().getFullYear()} AeroIntel. All rights reserved.
            </p>
            <p className="text-xs text-[var(--text-faint)]">
              Built with <span className="text-slate-200">&hearts;</span> for aviation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
