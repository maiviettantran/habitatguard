import { Button, Card, CardHeader, DECISION } from "./ui";

// Newest scans first. Held shipments can be approved or rejected right here.
export default function ActivityFeed({ log, pending, onResolve }) {
  const pendingIds = new Set(pending.map((p) => p.id));
  return (
    <Card id="log">
      <CardHeader title="Activity">
        <span>{log.length} {log.length === 1 ? "scan" : "scans"}</span>
      </CardHeader>
      {log.length === 0 ? (
        <p className="px-5 py-8 text-sm text-sub">Scans will appear here.</p>
      ) : (
        <ol className="divide-y divide-line">
          {log.slice(0, 7).map((e) => {
            const d = DECISION[e.decision];
            return (
              <li key={e.id} className="flex gap-3 px-5 py-3.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${d.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-xs font-semibold ${d.text}`}>{d.word}</span>
                    <span className="num text-xs text-sub">{e.time}</span>
                  </div>
                  <div className="truncate text-sm font-medium">{e.label}</div>
                  <div className="text-xs text-sub">{e.status}</div>
                  {pendingIds.has(e.id) && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="ok" className="h-8 px-2.5 text-xs" onClick={() => onResolve(e.id, true)}>
                        Approve
                      </Button>
                      <Button variant="bad" className="h-8 px-2.5 text-xs" onClick={() => onResolve(e.id, false)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
