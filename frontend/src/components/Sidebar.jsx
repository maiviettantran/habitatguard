import { useState } from "react";
import { LayoutGrid, PackageCheck, Gauge, Route, ScrollText, RotateCcw } from "lucide-react";

// Each nav item scrolls to its panel on the same page (no empty pages for judges to click).
const NAV = [
  { href: "#top", label: "Overview", icon: LayoutGrid },
  { href: "#intake", label: "Intake", icon: PackageCheck },
  { href: "#supplies", label: "Supplies", icon: Gauge },
  { href: "#plan", label: "Recovery plan", icon: Route },
  { href: "#log", label: "Activity", icon: ScrollText },
];

function Logo({ space }) {
  // Hand-drawn SVG mark: a shield with a dot (no image files).
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill={space ? "#eef1fa" : "#16181d"} />
      <path d="M14 6l6.5 2.7v5.1c0 4-2.8 6.9-6.5 8.2-3.7-1.3-6.5-4.2-6.5-8.2V8.7z" fill="none" stroke={space ? "#0e1322" : "#ffffff"} strokeWidth="1.6" />
      <circle cx="14" cy="13.5" r="2.4" fill={space ? "#0e1322" : "#ffffff"} />
    </svg>
  );
}

export default function Sidebar({ space, mission, station, shipmentTypes, armedType, onArm, onReset }) {
  const [active, setActive] = useState("#top");

  const stationText = station.online
    ? `Last packet ${station.last_packet_seconds_ago}s ago`
    : station.last_packet_seconds_ago === null
      ? "Waiting for first packet"
      : `Offline · last ${station.last_packet_seconds_ago}s ago`;

  return (
    <aside className={`${space ? "on-space bg-surface/85 backdrop-blur" : "bg-surface"} flex shrink-0 flex-col gap-4 border-b border-line px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0`}>
      <div className="flex items-center gap-2.5 px-1">
        <Logo space={space} />
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">HabitatGuard</div>
          <div className="text-xs text-sub">Supply intake & survival</div>
        </div>
      </div>

      <nav aria-label="Sections" className="flex flex-wrap gap-1 lg:flex-col">
        {NAV.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            onClick={() => setActive(href)}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              active === href ? "bg-sunken text-ink" : "text-sub hover:bg-sunken hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>

      <div className="hidden space-y-2 rounded-lg border border-line p-3 text-sm lg:block">
        <div className="text-xs font-medium text-sub">Mission</div>
        <div className="font-medium">{mission.name.replace(" (simulated)", "")}</div>
        <div className="text-sub">{mission.location}</div>
        <dl className="grid grid-cols-2 gap-y-1 pt-1">
          <dt className="text-sub">Crew</dt>
          <dd className="num text-right">{mission.crew_size}</dd>
          <dt className="text-sub">Resupply</dt>
          <dd className="num text-right">day {mission.next_resupply_in_days}</dd>
        </dl>
      </div>

      <div className="hidden space-y-2 rounded-lg border border-line p-3 text-sm lg:block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sub">ESP32 station</span>
          <span className={`h-2 w-2 rounded-full ${station.online ? "bg-ok" : "bg-line"}`} aria-hidden="true" />
        </div>
        <div className="text-sub">{stationText}</div>
        <label htmlFor="manifest" className="block pt-1 text-xs font-medium text-sub">
          Expects next
        </label>
        <select
          id="manifest"
          value={armedType}
          onChange={(e) => onArm(e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-sunken px-2 text-sm"
        >
          {Object.entries(shipmentTypes).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-auto hidden cursor-pointer lg:flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-sub hover:bg-sunken hover:text-ink"
      >
        <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
        Reset mission
      </button>
    </aside>
  );
}
