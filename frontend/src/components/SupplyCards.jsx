import { Utensils, Droplet, Wind, Zap } from "lucide-react";
import { Card, CardHeader, LEVEL, levelFor, fmt } from "./ui";

const ICON = { food: Utensils, water: Droplet, oxygen: Wind, energy: Zap };

// One tile per supply: days left, a bar, and a tick at the resupply day.
export default function SupplyCards({ resources, bottleneck }) {
  const resupply = bottleneck.next_resupply_in_days;
  const scale = Math.max(56, ...resources.map((r) => r.days)); // longest bar fits

  return (
    <Card id="supplies">
      <CardHeader title="Supplies">
        <span>Days left at current use · tick = resupply day {resupply}</span>
      </CardHeader>
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0">
        {resources.map((r) => {
          const Icon = ICON[r.key];
          const level = LEVEL[levelFor(r.days, resupply)];
          const isBottleneck = r.key === bottleneck.resource;
          return (
            <div key={r.key} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon size={16} strokeWidth={1.75} className="text-sub" aria-hidden="true" />
                  {r.label}
                </span>
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${level.text} ${level.soft}`}>
                  {isBottleneck ? "Bottleneck" : level.word}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`num text-3xl font-semibold ${r.days < resupply ? "text-bad" : ""}`}>{fmt(r.days)}</span>
                <span className="text-sm text-sub">days</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-sunken">
                <div
                  className={`h-1.5 rounded-full ${level.bar}`}
                  style={{ width: `${Math.min(100, (r.days / scale) * 100)}%` }}
                />
                <div
                  className="absolute -top-1 h-3.5 w-0.5 rounded bg-accent"
                  style={{ left: `${(resupply / scale) * 100}%` }}
                  title={`Resupply day ${resupply}`}
                />
              </div>
              <div className="num text-xs text-sub">
                {fmt(r.amount)} {r.unit} · −{r.daily_usage} {r.unit}/day
              </div>
              <div className="text-xs text-sub">
                Backup {r.backup_used ? "used" : <span className="num">{r.backup_amount} {r.unit}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
