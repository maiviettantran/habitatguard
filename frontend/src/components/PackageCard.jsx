import { CircleCheck, TriangleAlert, OctagonX, Thermometer, Droplets, Weight, Radar } from "lucide-react";
import { Button, Card, CardHeader, Chip, DECISION, fmt } from "./ui";

const ICON = { ACCEPT: CircleCheck, INSPECT: TriangleAlert, QUARANTINE: OctagonX };
const SENSOR_ICON = { Temperature: Thermometer, Humidity: Droplets, Weight: Weight, Presence: Radar };
const VERDICT = { ACCEPT: "Normal", INSPECT: "Off normal", QUARANTINE: "Out of range" };
const SOURCE = { preset: "Demo preset", manual: "Manual entry" };

function SensorTile({ check }) {
  const Icon = SENSOR_ICON[check.check];
  const missing = check.value === null;
  const ok = check.result === "ACCEPT";
  const d = DECISION[check.result];
  const unit = check.unit === "%" ? "%" : ` ${check.unit}`;
  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-3.5 ${ok ? "border-line" : `${d.border} ${d.soft}`}`}>
      <span className="flex items-center gap-1.5 text-sm text-sub">
        <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
        {check.check}
      </span>
      <div className={`num text-2xl font-semibold ${ok ? "" : d.text}`}>
        {missing ? "—" : check.value}
        {!missing && <span className="text-base font-medium">{unit}</span>}
      </div>
      <div className="text-xs">
        <span className={`font-medium ${ok ? "text-ok" : d.text}`}>{missing ? "No data" : VERDICT[check.result]}</span>
        <span className="text-sub"> · {check.range}</span>
      </div>
    </div>
  );
}

// The latest scan: decision, the four sensor readings, and what it did to survival time.
export default function PackageCard({ entry, isPending, onResolve }) {
  if (!entry) {
    return (
      <Card id="intake">
        <CardHeader title="Latest intake" />
        <div className="px-5 py-10 text-center text-sm text-sub">
          No package scanned yet. Place one on the station, or use <b className="font-medium text-ink">Simulate scan</b>.
        </div>
      </Card>
    );
  }

  const d = DECISION[entry.decision];
  const Icon = ICON[entry.decision];
  const im = entry.impact;
  const lost = Math.max(0, im.if_accepted_days - im.after_days);

  return (
    <Card id="intake">
      <CardHeader title="Latest intake">
        <span className="num text-xs">#{String(entry.id).padStart(3, "0")}</span>
        <span className="num text-xs">{entry.time}</span>
        <Chip>{SOURCE[entry.source] ?? `ESP32 · ${entry.source}`}</Chip>
      </CardHeader>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">{entry.label}</h3>
            <p className="text-sm text-sub">{entry.status}</p>
          </div>
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${d.border} ${d.soft}`}>
            <Icon size={26} strokeWidth={2} className={d.text} aria-hidden="true" />
            <div>
              <div className={`text-lg font-semibold leading-tight ${d.text}`}>{d.word}</div>
              <div className={`text-xs ${d.text}`}>{d.led} on the station</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {entry.checks.map((c) => (
            <SensorTile key={c.check} check={c} />
          ))}
        </div>

        <ul className="space-y-1 text-sm text-sub">
          {entry.checks
            .filter((c) => c.result !== "ACCEPT")
            .map((c) => (
              <li key={c.check} className="flex gap-2">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${DECISION[c.result].dot}`} aria-hidden="true" />
                {c.reason}
              </li>
            ))}
        </ul>

        <div className="grid gap-3 rounded-lg bg-sunken p-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-sub">{im.resource_label} supply</div>
            <div className="num text-lg font-semibold">
              {fmt(im.before_days)} → <span className={entry.decision === "ACCEPT" ? "text-ok" : ""}>{fmt(im.after_days)}</span> d
            </div>
          </div>
          <div>
            <div className="text-xs text-sub">If it had been usable</div>
            <div className={`num text-lg font-semibold ${lost > 0 ? "text-sub line-through" : ""}`}>{fmt(im.if_accepted_days)} d</div>
          </div>
          <div>
            <div className="text-xs text-sub">Crew can last</div>
            <div className="num text-lg font-semibold">
              {fmt(im.survival_before)} → {fmt(im.survival_after)} d
            </div>
          </div>
        </div>

        {isPending && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
            <p className="text-sm text-warn">
              Held for crew inspection. Approving brings {im.resource_label.toLowerCase()} to{" "}
              <span className="num font-semibold">{fmt(im.if_accepted_days)} days</span>.
            </p>
            <div className="flex gap-2">
              <Button variant="ok" onClick={() => onResolve(entry.id, true)}>
                Approve
              </Button>
              <Button variant="bad" onClick={() => onResolve(entry.id, false)}>
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
