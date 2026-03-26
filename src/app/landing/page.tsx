import {
  Radar,
  Plane,
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
  Database,
  Radio,
  Globe2,
  Zap,
  Quote,
} from "lucide-react";
import LiveFlightCount from "@/components/landing/LiveFlightCount";
import HeroBackground from "@/components/landing/HeroBackground";
import ScrollAnimator from "@/components/landing/ScrollAnimator";
import FeatureCard from "@/components/landing/FeatureCard";
import PricingCard from "@/components/landing/PricingCard";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import AuthModal from "@/components/landing/AuthModal";

const features = [
  { icon: <Plane size={18} />, title: "Live Flight Tracking", description: "Track every aircraft in real-time with ADS-B data across global airspace." },
  { icon: <Radar size={18} />, title: "Airport Radar", description: "Airport-centric radar with range rings and bearing tools for approach monitoring." },
  { icon: <Monitor size={18} />, title: "FIDS Board", description: "Real-time arrivals and departures that mirror actual airport display screens." },
  { icon: <Users size={18} />, title: "Fleet Tracker", description: "Monitor entire airline fleets globally with full position history." },
  { icon: <FileSearch size={18} />, title: "Aircraft Profiles", description: "Detailed dossier on any aircraft including registration, type, and operator." },
  { icon: <Bot size={18} />, title: "AI Copilot", description: "Natural language flight search and analysis powered by machine intelligence." },
  { icon: <BarChart3 size={18} />, title: "Statistics Dashboard", description: "Real-time traffic analytics, trends, and operational performance metrics." },
  { icon: <GitCompare size={18} />, title: "Multi-Aircraft Comparison", description: "Side-by-side analysis of flight parameters for any two aircraft." },
  { icon: <Bell size={18} />, title: "Alert System", description: "Custom alerts for aircraft movements, airspace events, and emergencies." },
  { icon: <CloudLightning size={18} />, title: "Turbulence Map", description: "Live turbulence detection and pilot-reported conditions overlay." },
  { icon: <ShieldCheck size={18} />, title: "Airspace Boundaries", description: "FIR, TMA, restricted zones, and military airspace visualization." },
  { icon: <FileWarning size={18} />, title: "NOTAMs", description: "Active NOTAMs and Temporary Flight Restrictions mapped in real-time." },
  { icon: <Satellite size={18} />, title: "GPS Integrity", description: "Spoofing detection and ADS-B signal quality analysis for every flight." },
  { icon: <Code2 size={18} />, title: "Embeddable Widget", description: "Drop a live tracking widget onto any website with one line of code." },
  { icon: <FileCode size={18} />, title: "API Access", description: "Full-featured developer API for custom integrations and data pipelines." },
  { icon: <FileSpreadsheet size={18} />, title: "Export & Reports", description: "Generate PDF reports and export flight data in CSV or JSON format." },
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] overflow-x-hidden">
      {/* ─── NAVIGATION ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[rgba(6,8,13,0.8)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/landing" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,#38bdf8,#8b5cf6)] flex items-center justify-center">
                <Plane size={16} className="text-white -rotate-45" />
              </div>
              <span className="font-semibold text-[var(--text-primary)] tracking-tight">
                Aero<span className="text-[var(--accent-primary)]">Intel</span>
              </span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
              <a href="#data" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Data</a>
              <a href="#pricing" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Pricing</a>
              <a href="#compare" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">Compare</a>
            </div>
          </div>
          <AuthModal />
        </div>
      </nav>

      {/* ─── HERO SECTION ───────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <HeroBackground />

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-[linear-gradient(to_top,var(--surface-0),transparent)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="mb-6">
            <LiveFlightCount />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="bg-[linear-gradient(135deg,#38bdf8_0%,#818cf8_50%,#c084fc_100%)] bg-clip-text text-transparent" style={{ backgroundSize: "200% 200%", animation: "gradient-shift 6s ease infinite" }}>
              Aviation Intelligence,
            </span>
            <br />
            <span className="text-[var(--text-primary)]">Reimagined</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-tertiary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time flight tracking, AI-powered analytics, and operational intelligence that puts Flightradar24 to shame.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12 flex-wrap">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--surface-0)] font-semibold text-sm hover:bg-sky-300 transition-all duration-200 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]"
            >
              Launch Platform
              <span className="text-base">&rarr;</span>
            </a>
            <a
              href="/api/flights"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              View API Docs
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {["ADS-B", "MLAT", "500+ Airports", "Real-time"].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-full text-xs font-mono font-medium text-[var(--text-muted)] border border-[var(--border-subtle)] bg-[var(--surface-1)]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ───────────────────────────── */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-[var(--accent-primary)] border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.06)] mb-4 tracking-wider uppercase">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need for aviation intelligence
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto">
              16 integrated tools working together to give you unmatched situational awareness.
            </p>
          </ScrollAnimator>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
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

      {/* ─── DATA SECTION ───────────────────────────────── */}
      <section id="data" className="relative py-32 px-6">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.04)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-emerald-400 border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.06)] mb-4 tracking-wider uppercase">
              Data Sources
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Powered by Real Data
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto">
              Aggregating multiple aviation data feeds for comprehensive global coverage.
            </p>
          </ScrollAnimator>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { value: 40000, suffix: "+", label: "Aircraft tracked daily" },
              { value: 7000, suffix: "+", label: "Airports worldwide" },
              { value: 500, suffix: "+", label: "Airlines monitored" },
              { value: 3, label: "Second refresh rate", suffix: "s" },
            ].map((stat, i) => (
              <ScrollAnimator key={stat.label} delay={i * 100}>
                <div className="text-center p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  <p className="mt-2 text-sm text-[var(--text-tertiary)]">{stat.label}</p>
                </div>
              </ScrollAnimator>
            ))}
          </div>

          {/* Data sources */}
          <ScrollAnimator>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { icon: <Radio size={20} />, name: "ADS-B Exchange" },
                { icon: <Satellite size={20} />, name: "MLAT Network" },
                { icon: <Globe2 size={20} />, name: "airplanes.live" },
              ].map((source) => (
                <div
                  key={source.name}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]"
                >
                  <span className="text-[var(--accent-primary)]">{source.icon}</span>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{source.name}</span>
                </div>
              ))}
            </div>
          </ScrollAnimator>

          {/* Animated dots visual */}
          <ScrollAnimator className="mt-16 flex justify-center">
            <div className="relative w-full max-w-2xl h-32">
              <svg viewBox="0 0 600 100" className="w-full h-full" fill="none">
                {/* Globe outline */}
                <ellipse cx="300" cy="50" rx="250" ry="40" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
                <ellipse cx="300" cy="50" rx="250" ry="40" stroke="rgba(56,189,248,0.08)" strokeWidth="1" transform="rotate(30, 300, 50)" />
                <ellipse cx="300" cy="50" rx="250" ry="40" stroke="rgba(56,189,248,0.06)" strokeWidth="1" transform="rotate(-30, 300, 50)" />

                {/* Data points */}
                {[
                  [120, 35], [180, 28], [220, 55], [280, 42], [320, 60],
                  [360, 30], [400, 48], [440, 25], [480, 55], [160, 62],
                  [250, 70], [350, 68], [420, 38], [500, 42], [140, 48],
                ].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="2" fill="rgba(56,189,248,0.6)">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r="6" fill="none" stroke="rgba(56,189,248,0.2)">
                      <animate attributeName="r" values="3;8;3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </svg>
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ───────────────────────────── */}
      <section id="compare" className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-purple-400 border border-[rgba(168,85,247,0.2)] bg-[rgba(168,85,247,0.06)] mb-4 tracking-wider uppercase">
              Comparison
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Why AeroIntel vs Flightradar24
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto">
              See how AeroIntel stacks up against the industry incumbent.
            </p>
          </ScrollAnimator>

          <ScrollAnimator>
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--surface-1)]">
              {/* Table header */}
              <div className="grid grid-cols-4 gap-0 border-b border-[var(--border-default)] bg-[var(--surface-2)]">
                <div className="p-4 text-sm font-semibold text-[var(--text-tertiary)]">Feature</div>
                <div className="p-4 text-sm font-semibold text-[var(--accent-primary)] text-center">AeroIntel</div>
                <div className="p-4 text-sm font-semibold text-[var(--text-muted)] text-center">FR24 Free</div>
                <div className="p-4 text-sm font-semibold text-[var(--text-muted)] text-center">FR24 Business</div>
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
                  <div className="p-4 text-center">
                    <span className="text-emerald-400 text-base">&#10003;</span>
                  </div>
                  <div className="p-4 text-center">
                    {row.fr24Free ? (
                      <span className="text-emerald-400 text-base">&#10003;</span>
                    ) : (
                      <span className="text-[var(--text-faint)] text-base">&#10005;</span>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    {row.fr24Biz ? (
                      <span className="text-emerald-400 text-base">&#10003;</span>
                    ) : (
                      <span className="text-[var(--text-faint)] text-base">&#10005;</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ─── PRICING SECTION ────────────────────────────── */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-amber-400 border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.06)] mb-4 tracking-wider uppercase">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Choose your plan
            </h2>
            <p className="text-[var(--text-tertiary)] max-w-xl mx-auto">
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

      {/* ─── TESTIMONIALS ───────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollAnimator className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold text-sky-400 border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.06)] mb-4 tracking-wider uppercase">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Trusted by aviation professionals
            </h2>
          </ScrollAnimator>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollAnimator key={t.name} delay={i * 100}>
                <div className="relative p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] h-full">
                  <Quote size={24} className="text-[var(--accent-primary)] opacity-20 mb-4" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] border border-[var(--border-default)] flex items-center justify-center">
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

      {/* ─── CTA SECTION ────────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollAnimator>
            <div className="relative p-12 rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(56, 189, 248, 0.04) 100%)"
            }}>
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,transparent_70%)] pointer-events-none" />

              <div className="relative">
                <Zap size={32} className="text-[var(--accent-primary)] mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-4">
                  Ready to elevate your aviation intelligence?
                </h2>
                <p className="text-[var(--text-tertiary)] mb-8 max-w-lg mx-auto">
                  Join thousands of aviation professionals, enthusiasts, and organizations using AeroIntel every day.
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--surface-0)] font-semibold text-sm hover:bg-sky-300 transition-all duration-200 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]"
                >
                  Launch AeroIntel
                  <span>&rarr;</span>
                </a>
              </div>
            </div>
          </ScrollAnimator>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-0)] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,#38bdf8,#8b5cf6)] flex items-center justify-center">
                  <Plane size={16} className="text-white -rotate-45" />
                </div>
                <span className="font-semibold text-[var(--text-primary)] tracking-tight">
                  Aero<span className="text-[var(--accent-primary)]">Intel</span>
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Aviation intelligence for the modern world. Real-time tracking, AI analytics, and operational insights.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {["Live Map", "Fleet Tracker", "Airport Radar", "AI Copilot"].map((link) => (
                  <li key={link}>
                    <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Developers</h4>
              <ul className="space-y-2.5">
                {["API Documentation", "Embeddable Widget", "Status Page", "Changelog"].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["Pricing", "Contact", "Privacy Policy", "Terms of Service"].map((link) => (
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
              Built with <span className="text-red-400">&hearts;</span> for aviation
            </p>
            {/* Social placeholders */}
            <div className="flex items-center gap-3">
              {["X", "GH", "DC"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
