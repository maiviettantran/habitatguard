"""
HabitatGuard API (FastAPI).

Run:  uvicorn app:app --reload --host 0.0.0.0 --port 8000   (from the backend/ folder)

The website and the ESP32 both talk to this server. State is kept in memory,
so restarting the server (or POST /api/reset) starts the mission over.
"""

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import engine

app = FastAPI(title="HabitatGuard API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STATE = engine.new_state()


class Readings(BaseModel):
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    weight_g: Optional[float] = None
    distance_cm: Optional[float] = None


class ScanRequest(BaseModel):
    shipment_type: str
    readings: Readings


class Telemetry(Readings):
    """What the ESP32 sends. shipment_type is optional - if missing we use the armed manifest."""
    device_id: str = "esp32-intake-1"
    shipment_type: Optional[str] = None


class ManifestRequest(BaseModel):
    shipment_type: str


class InspectionRequest(BaseModel):
    approve: bool


def bad_request(e):
    raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/state")
def get_state():
    return engine.snapshot(STATE)


@app.post("/api/scan")
def manual_scan(req: ScanRequest):
    """Manual scan from the dashboard form."""
    try:
        entry = engine.process_scan(STATE, req.shipment_type, req.readings.model_dump(), source="manual")
    except ValueError as e:
        bad_request(e)
    return {"result": entry, "state": engine.snapshot(STATE)}


@app.post("/api/scenarios/{scenario_id}")
def run_scenario(scenario_id: str):
    """One-click preset scenario."""
    sc = next((s for s in engine.SCENARIOS if s["id"] == scenario_id), None)
    if sc is None:
        raise HTTPException(status_code=404, detail="Unknown scenario")
    entry = engine.process_scan(STATE, sc["shipment_type"], dict(sc["readings"]), source="preset")
    return {"result": entry, "state": engine.snapshot(STATE)}


@app.post("/api/telemetry")
def esp32_telemetry(t: Telemetry):
    """Called by the ESP32. Returns a short answer so the board can light the right LED."""
    shipment_type = t.shipment_type or STATE["armed_type"]
    readings = t.model_dump(include={"temperature_c", "humidity_pct", "weight_g", "distance_cm"})
    try:
        entry = engine.process_scan(STATE, shipment_type, readings, source=t.device_id)
    except ValueError as e:
        bad_request(e)
    led = {"ACCEPT": "GREEN", "INSPECT": "YELLOW", "QUARANTINE": "RED"}[entry["decision"]]
    return {"decision": entry["decision"], "led": led, "id": entry["id"]}


@app.post("/api/manifest")
def set_manifest(req: ManifestRequest):
    """Tell the intake station what shipment type to expect next."""
    if req.shipment_type not in engine.SHIPMENT_TYPES:
        raise HTTPException(status_code=400, detail="Unknown shipment type")
    STATE["armed_type"] = req.shipment_type
    return engine.snapshot(STATE)


@app.post("/api/inspections/{entry_id}")
def resolve(entry_id: int, req: InspectionRequest):
    try:
        engine.resolve_inspection(STATE, entry_id, req.approve)
    except ValueError as e:
        bad_request(e)
    return engine.snapshot(STATE)


@app.post("/api/actions/{action_id}")
def do_action(action_id: str):
    try:
        engine.apply_action(STATE, action_id)
    except ValueError as e:
        bad_request(e)
    return engine.snapshot(STATE)


@app.post("/api/plan/apply")
def do_plan():
    """Apply every action in the recommended recovery plan at once."""
    try:
        engine.apply_plan(STATE)
    except ValueError as e:
        bad_request(e)
    return engine.snapshot(STATE)


@app.post("/api/reset")
def reset():
    global STATE
    STATE = engine.new_state()
    return engine.snapshot(STATE)


# If the React app has been built (npm run build), serve it from the same server.
DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
