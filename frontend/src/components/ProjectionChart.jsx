import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "./ui";

const SUB = "#5b606b", LINE = "#e3e3de", ACCENT = "#2741d6", BAD = "#b9332a";

// Stock of the bottleneck supply over the coming days: as things are, and with the recovery plan.
// Where a line hits zero is the day that supply runs out; the dashed line is the resupply.
export default function ProjectionChart({ projection, resupply, hasPlan }) {
  const { label, unit, points } = projection;
  const runsOut = points.find((p) => p.current === 0)?.day;

  return (
    <Card>
      <CardHeader title={`${label} stock projection`}>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: BAD }} aria-hidden="true" /> current plan
        </span>
        {hasPlan && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: ACCENT }} aria-hidden="true" /> with recovery plan
          </span>
        )}
      </CardHeader>
      <div className="px-3 pt-4 pb-2">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={points} margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis
                dataKey="day"
                type="number"
                domain={[0, points.length - 1]}
                ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40]}
                tick={{ fill: SUB, fontSize: 12 }}
                stroke={LINE}
                label={{ value: "days from now", position: "insideBottomRight", offset: -4, fill: SUB, fontSize: 12 }}
              />
              <YAxis tick={{ fill: SUB, fontSize: 12 }} stroke={LINE} width={44} unit="" />
              <Tooltip
                contentStyle={{ border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => `Day ${d}`}
                formatter={(v, name) => [`${v} ${unit}`, name === "current" ? "Current plan" : "With recovery plan"]}
              />
              <ReferenceLine
                x={resupply}
                stroke={ACCENT}
                strokeDasharray="4 4"
                label={{ value: `Resupply · day ${resupply}`, position: "top", fill: ACCENT, fontSize: 12 }}
              />
              <Line type="linear" dataKey="current" stroke={BAD} strokeWidth={2} dot={false} isAnimationActive={false} />
              {hasPlan && (
                <Line type="linear" dataKey="plan" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="px-2 pb-2 text-sm text-sub">
          {label} stock in {unit}.{" "}
          {runsOut !== undefined && runsOut < resupply ? (
            <>
              At current use it hits zero on <span className="num font-medium text-ink">day {runsOut}</span>, before the resupply.
            </>
          ) : (
            <>It lasts past the resupply at current use.</>
          )}
        </p>
      </div>
    </Card>
  );
}
