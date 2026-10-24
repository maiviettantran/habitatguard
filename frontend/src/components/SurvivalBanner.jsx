import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, fmt } from "./ui";

// The one number that matters: how long the crew can last, vs. the next resupply.
export default function SurvivalBanner({ bottleneck: b, plan }) {
  const short = b.shortfall_days > 0;
  const tone = b.level === "CRITICAL" ? "bad" : b.level === "WATCH" ? "warn" : "ok";
  const status = { CRITICAL: "At risk", WATCH: "Tight", SAFE: "On track" }[b.level];
  // Real NASA photo (not AI-generated). Saved as frontend/public/earthrise.jpg.
  // If the file is missing, the banner simply shows without it.
  const [photo, setPhoto] = useState(true);

  return (
    <section className="flex overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-1 flex-wrap items-center justify-between gap-6 px-6 py-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-sm text-sub">Crew can last</div>
          <div className="flex items-baseline gap-2">
            <span className={`num text-5xl font-semibold ${short ? "text-bad" : ""}`}>{fmt(b.days)}</span>
            <span className="text-lg text-sub">days</span>
          </div>
        </div>
        <p className="max-w-md pb-1 text-[15px] leading-relaxed text-sub">
          <span className="font-medium text-ink">{b.label}</span> runs out first
          {short ? (
            <>
              {" — "}
              <span className="font-medium text-bad">{fmt(b.shortfall_days)} days before</span> the resupply on day{" "}
              {b.next_resupply_in_days}.
            </>
          ) : (
            <>, with {fmt(b.days - b.next_resupply_in_days)} days of margin after the resupply on day {b.next_resupply_in_days}.</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={tone}>{status}</Chip>
        {plan && (
          <a href="#plan" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
            Plan gets {plan.label.toLowerCase()} to {fmt(plan.after_days)} days
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>
      </div>
      {photo && (
        <figure className="relative m-0 hidden w-72 shrink-0 md:block">
          <img
            src="/earthrise.jpg"
            alt="Earth rising over the Moon's horizon, photographed from Apollo 8"
            onError={() => setPhoto(false)}
            className="h-full w-full object-cover"
          />
          <figcaption className="absolute right-2 bottom-1.5 text-[10px] text-white/80">
            Earthrise · NASA/William Anders
          </figcaption>
        </figure>
      )}
    </section>
  );
}
