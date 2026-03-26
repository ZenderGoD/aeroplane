export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", zIndex: 9999, background: "var(--surface-0)" }}>
      {children}
    </div>
  );
}
