// Every call to the backend lives here. Each POST returns the new habitat state.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  getState: () => request("/state"),
  runScenario: (id) => post(`/scenarios/${id}`).then((r) => r.state),
  manualScan: (shipment_type, readings) => post("/scan", { shipment_type, readings }).then((r) => r.state),
  setManifest: (shipment_type) => post("/manifest", { shipment_type }),
  resolveInspection: (id, approve) => post(`/inspections/${id}`, { approve }),
  applyAction: (id) => post(`/actions/${id}`),
  applyPlan: () => post("/plan/apply"),
  reset: () => post("/reset"),
};
