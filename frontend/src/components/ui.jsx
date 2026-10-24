// Small shared building blocks used by every panel.

// One place that maps a decision to its words and colours.
export const DECISION = {
  ACCEPT: { word: "Accepted", text: "text-ok", soft: "bg-ok-soft", border: "border-ok/40", dot: "bg-ok", led: "Green LED" },
  INSPECT: { word: "Needs inspection", text: "text-warn", soft: "bg-warn-soft", border: "border-warn/40", dot: "bg-warn", led: "Yellow LED" },
  QUARANTINE: { word: "Quarantined", text: "text-bad", soft: "bg-bad-soft", border: "border-bad/40", dot: "bg-bad", led: "Red LED" },
};

// Status of a supply compared with the next resupply day.
export const LEVEL = {
  CRITICAL: { word: "Short", text: "text-bad", soft: "bg-bad-soft", bar: "bg-bad" },
  WATCH: { word: "Watch", text: "text-warn", soft: "bg-warn-soft", bar: "bg-warn" },
  SAFE: { word: "OK", text: "text-ok", soft: "bg-ok-soft", bar: "bg-ink" },
};

export function levelFor(days, resupply) {
  if (days < resupply) return "CRITICAL";
  if (days < resupply + 5) return "WATCH";
  return "SAFE";
}

export const fmt = (n, digits = 1) =>
  n === null || n === undefined ? "—" : Number(n).toFixed(digits);

export function Card({ id, className = "", children }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-xl border border-line bg-surface ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {children && <div className="flex items-center gap-3 text-sm text-sub">{children}</div>}
    </div>
  );
}

export function Chip({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-sunken text-sub border-line",
    ok: "bg-ok-soft text-ok border-ok/30",
    warn: "bg-warn-soft text-warn border-warn/30",
    bad: "bg-bad-soft text-bad border-bad/30",
    accent: "bg-accent-soft text-accent border-accent/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Button({ variant = "default", className = "", ...props }) {
  const styles = {
    default: "border-line bg-surface text-ink hover:bg-sunken",
    primary: "border-accent bg-accent text-white hover:bg-[#1f35b8]",
    ok: "border-ok/40 bg-ok-soft text-ok hover:border-ok",
    bad: "border-bad/40 bg-bad-soft text-bad hover:border-bad",
  };
  return (
    <button
      type="button"
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export const decisionTone = { ACCEPT: "ok", INSPECT: "warn", QUARANTINE: "bad" };
