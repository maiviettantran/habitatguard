import { Check } from "lucide-react";
import { Button, Card, CardHeader, Chip, fmt } from "./ui";

function Effects({ effect }) {
  const entries = Object.entries(effect);
  if (!entries.length) return null;
  return (
    <span className="num flex flex-wrap gap-x-3 text-xs">
      {entries.map(([k, d]) => (
        <span key={k} className={d >= 0 ? "text-ok" : "text-bad"}>
          {k} {d >= 0 ? "+" : "−"}
          {fmt(Math.abs(d))} d
        </span>
      ))}
    </span>
  );
}

// The recommended plan (computed by the backend) plus every single action on its own.
export default function RecoveryPlan({ plan, recommendations, bottleneck, applied, onApplyPlan, onApply }) {
  return (
    <Card id="plan">
      <CardHeader title="Recovery plan">
        <span>
          for <span className="font-medium text-ink">{bottleneck.label}</span>
        </span>
      </CardHeader>

      <div className="space-y-4 p-5">
        {plan ? (
          <div className="space-y-3 rounded-lg border border-accent/30 bg-accent-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-accent">Recommended</div>
                <div className="num mt-0.5 text-lg font-semibold">
                  {plan.label} {fmt(plan.before_days)} → {fmt(plan.after_days)} days
                </div>
                <div className="text-sm text-sub">
                  {plan.closes_gap
                    ? `Lasts until the resupply on day ${bottleneck.next_resupply_in_days}.`
                    : "Not enough on its own: request an early resupply."}
                  {!plan.uses_backup && " No emergency reserve used."}
                </div>
              </div>
              <Button variant="primary" onClick={onApplyPlan}>
                Apply plan
              </Button>
            </div>
            <ol className="space-y-1.5">
              {plan.actions.map((a, i) => (
                <li key={a.id} className="flex items-center gap-2.5 text-sm">
                  <span className="num grid h-5 w-5 place-items-center rounded-full bg-surface text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  {a.title}
                </li>
              ))}
            </ol>
            {Object.keys(plan.side_effects).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-sub">
                Trade-off: <Effects effect={plan.side_effects} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">
            <Check size={16} aria-hidden="true" />
            Every supply lasts until the resupply. No action needed.
          </div>
        )}

        <div>
          <div className="mb-1 text-xs font-medium text-sub">All options for {bottleneck.label.toLowerCase()}</div>
          <ul className="divide-y divide-line">
            {recommendations.map((r, i) => (
              <li key={r.id ?? `note-${i}`} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {r.title}
                    {r.is_backup && <Chip tone="warn">Emergency</Chip>}
                    {!r.id && <Chip>Logistics</Chip>}
                  </div>
                  <div className="text-xs text-sub">{r.why}</div>
                  <Effects effect={r.effect_days} />
                </div>
                {r.id && (
                  <Button onClick={() => onApply(r.id)} className="shrink-0">
                    Apply
                  </Button>
                )}
              </li>
            ))}
            {recommendations.length === 0 && <li className="py-3 text-sm text-sub">No more actions available.</li>}
          </ul>
        </div>

        {applied.length > 0 && (
          <div className="text-xs text-sub">
            Active: {applied.map((a) => a.title).join(" · ")}
          </div>
        )}
      </div>
    </Card>
  );
}
