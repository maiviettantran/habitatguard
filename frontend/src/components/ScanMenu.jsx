import { useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "./ui";

// What each preset is expected to produce, shown as a coloured dot.
const EXPECTED = {
  normal_food: "bg-ok",
  normal_water: "bg-ok",
  normal_battery: "bg-ok",
  warm_food: "bg-warn",
  overheated_food: "bg-bad",
  underweight_food: "bg-bad",
  damaged_air_filter: "bg-bad",
};

const FIELDS = [
  ["temperature_c", "Temperature (°C)"],
  ["humidity_pct", "Humidity (%)"],
  ["weight_g", "Weight (g)"],
  ["distance_cm", "Distance (cm)"],
];
const EMPTY = { temperature_c: "", humidity_pct: "", weight_g: "", distance_cm: "" };

// The "Simulate scan" button: preset scenarios, or type readings by hand.
export default function ScanMenu({ scenarios, shipmentTypes, onScenario, onManual }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [type, setType] = useState("food");
  const [form, setForm] = useState(EMPTY);

  const pick = (id) => {
    onScenario(id);
    setOpen(false);
  };

  const submit = (e) => {
    e.preventDefault();
    // An empty box means "sensor sent nothing" -> the engine treats it as missing data
    const readings = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : Number(v)]));
    onManual(type, readings);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <ScanLine size={16} strokeWidth={2} aria-hidden="true" />
        Simulate scan
      </Button>

      {open && (
        <div className="on-light absolute right-0 z-20 mt-2 w-[min(92vw,380px)] rounded-xl border border-line bg-surface p-2 shadow-[0_8px_24px_rgba(22,24,29,0.08)]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">{manual ? "Manual reading" : "Demo scenarios"}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="cursor-pointer rounded p-1 text-sub hover:bg-sunken">
              <X size={16} />
            </button>
          </div>

          {!manual ? (
            <>
              <ul className="space-y-0.5">
                {scenarios.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s.id)}
                      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-sunken"
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EXPECTED[s.id] ?? "bg-line"}`} aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-medium">{s.name}</span>
                        <span className="block text-xs text-sub">{s.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setManual(true)}
                className="mt-1 w-full cursor-pointer rounded-lg border-t border-line px-2 py-2.5 text-left text-sm font-medium text-accent hover:bg-sunken"
              >
                Enter readings manually
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-3 p-2">
              <label className="block text-xs font-medium text-sub">
                Shipment type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-line bg-sunken px-2 text-sm text-ink"
                >
                  {Object.entries(shipmentTypes).map(([k, t]) => (
                    <option key={k} value={k}>
                      {t.label} · expects {t.expected_weight_g} g
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(([key, label]) => (
                  <label key={key} className="text-xs font-medium text-sub">
                    {label}
                    <input
                      type="number"
                      step="any"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="num mt-1 h-9 w-full rounded-lg border border-line bg-sunken px-2 text-sm text-ink"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-sub">Leave a box empty to simulate a sensor that sent nothing.</p>
              <div className="flex gap-2">
                <Button onClick={() => setManual(false)}>Back</Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Run decision engine
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
