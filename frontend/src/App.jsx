import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import ScanMenu from "./components/ScanMenu";
import SurvivalBanner from "./components/SurvivalBanner";
import PackageCard from "./components/PackageCard";
import ActivityFeed from "./components/ActivityFeed";
import SupplyCards from "./components/SupplyCards";
import ProjectionChart from "./components/ProjectionChart";
import RecoveryPlan from "./components/RecoveryPlan";
import SpaceBackground from "./components/SpaceBackground";

const POLL_MS = 2000; // check every 2 s so ESP32 scans appear on their own

export default function App() {
  const [state, setState] = useState(null);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  // Light is the default; "space" is the dark starfield look. Remembered in this browser only.
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("hg-theme") || "light";
    } catch {
      return "light";
    }
  });
  const space = theme === "space";

  useEffect(() => {
    document.body.dataset.theme = theme;
    try {
      localStorage.setItem("hg-theme", theme);
    } catch {
      /* storage blocked: the choice just won't be remembered */
    }
  }, [theme]);

  const refresh = useCallback(async () => {
    try {
      setState(await api.getState());
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Every button: call the API, then show the new state (or the error)
  const run = async (promise) => {
    setError("");
    try {
      setState(await promise);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!state) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-sub">
        {online ? "Connecting to the habitat…" : "The backend is offline. Start it with RUN_HABITATGUARD.bat."}
      </div>
    );
  }

  const latest = state.log[0];
  const isPending = latest && state.pending.some((p) => p.id === latest.id);
  const resolve = (id, ok) => run(api.resolveInspection(id, ok));
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="lg:flex">
      {space && <SpaceBackground />}
      <Sidebar
        space={space}
        mission={state.mission}
        station={state.station}
        shipmentTypes={state.shipment_types}
        armedType={state.armed_type}
        onArm={(t) => run(api.setManifest(t))}
        onReset={() => run(api.reset())}
      />

      <main id="top" className="min-w-0 flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className={`${space ? "on-space" : ""} flex flex-wrap items-center justify-between gap-4`}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mission overview</h1>
            <p className="text-sm text-sub">
              {today} · {state.mission.location}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div role="group" aria-label="Theme" className="flex rounded-lg border border-line bg-surface p-0.5">
              {[
                ["light", "Light", Sun],
                ["space", "Space", Moon],
              ].map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={theme === key}
                  onClick={() => setTheme(key)}
                  className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm ${
                    theme === key ? "bg-sunken font-medium text-ink" : "text-sub hover:text-ink"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-2 text-sm text-sub">
              <span className={`h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-bad"}`} aria-hidden="true" />
              {online ? "Live" : "Backend offline"}
            </span>
            <ScanMenu
              scenarios={state.scenarios}
              shipmentTypes={state.shipment_types}
              onScenario={(id) => run(api.runScenario(id))}
              onManual={(type, readings) => run(api.manualScan(type, readings))}
            />
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-bad/40 bg-bad-soft px-4 py-2.5 text-sm text-bad">
            {error}
          </div>
        )}

        <SurvivalBanner bottleneck={state.bottleneck} plan={state.plan} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <PackageCard entry={latest} isPending={isPending} onResolve={resolve} />
          <ActivityFeed log={state.log} pending={state.pending} onResolve={resolve} />
        </div>

        <SupplyCards resources={state.resources} bottleneck={state.bottleneck} />

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <ProjectionChart
            projection={state.projection}
            resupply={state.mission.next_resupply_in_days}
            hasPlan={Boolean(state.plan)}
          />
          <RecoveryPlan
            plan={state.plan}
            recommendations={state.recommendations}
            bottleneck={state.bottleneck}
            applied={state.applied_actions}
            onApplyPlan={() => run(api.applyPlan())}
            onApply={(id) => run(api.applyAction(id))}
          />
        </div>

        <details className="rounded-xl border border-line bg-surface px-5 py-3 text-sm text-sub">
          <summary className="cursor-pointer font-medium text-ink">Model assumptions</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {state.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      </main>
    </div>
  );
}
