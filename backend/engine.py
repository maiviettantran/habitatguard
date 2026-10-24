"""
HabitatGuard engine: all the "thinking" lives here, with no web code.

Three parts:
  1. Decision engine   -> evaluate_shipment(): Accept / Inspect / Quarantine + reasons
  2. Survival model    -> days_remaining(): amount / daily usage
  3. Recommendations   -> recommend(): what to do about the bottleneck

The habitat "state" is a plain Python dict so it is easy to print and explain.
"""

import copy
import json
import time
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

ACCEPT, INSPECT, QUARANTINE = "ACCEPT", "INSPECT", "QUARANTINE"
SEVERITY = {ACCEPT: 0, INSPECT: 1, QUARANTINE: 2}

# Weight rule (fraction of expected weight)
WEIGHT_OK = 0.90        # >= 90% -> fine
WEIGHT_INSPECT = 0.75   # 75%..90% -> inspect, below 75% -> quarantine
WEIGHT_TOO_HEAVY = 1.10 # > 110% -> inspect (wrong item / contamination?)

# Presence rule (ultrasonic sensor): package must be closer than this
PRESENCE_MAX_CM = 15


def load_json(name):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


HABITAT = load_json("habitat.json")
SHIPMENT_TYPES = {k: v for k, v in load_json("shipment_types.json").items() if not k.startswith("_")}
SCENARIOS = load_json("scenarios.json")
ACTIONS = {k: v for k, v in load_json("actions.json").items() if not k.startswith("_")}


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

def new_state():
    """Fresh habitat state at the start of the demo."""
    state = {
        "mission": copy.deepcopy(HABITAT["mission"]),
        "resources": copy.deepcopy(HABITAT["resources"]),
        "usage_multiplier": {k: 1.0 for k in HABITAT["resources"]},
        "usage_offset": {k: 0.0 for k in HABITAT["resources"]},
        "backup_used": {k: False for k in HABITAT["resources"]},
        "applied_actions": [],
        "log": [],        # every shipment scan
        "pending": [],    # shipments waiting for crew inspection
        "history": [],    # survival days after every event (for the chart)
        "armed_type": "food",  # what the ESP32 station expects next (from the cargo manifest)
        "next_id": 1,
    }
    record_history(state, "Mission start")
    return state


# ---------------------------------------------------------------------------
# 2. Survival model
# ---------------------------------------------------------------------------

def daily_usage(state, key):
    """How much of a resource the habitat uses per day, after any actions."""
    r = state["resources"][key]
    crew = state["mission"]["crew_size"]
    base = r["usage_per_crew_per_day"] * crew if r["per_crew"] else r["usage_per_day"]
    usage = base * state["usage_multiplier"][key] + state["usage_offset"][key]
    return max(usage, 0.01)  # never divide by zero


def days_remaining(state, key):
    """days_remaining = current_resource_amount / daily_crew_usage"""
    return state["resources"][key]["amount"] / daily_usage(state, key)


def all_days(state):
    return {k: round(days_remaining(state, k), 1) for k in state["resources"]}


def bottleneck(state):
    """The resource that runs out first limits how long the crew can survive."""
    days = all_days(state)
    key = min(days, key=days.get)
    resupply = state["mission"]["next_resupply_in_days"]
    gap = round(resupply - days[key], 1)
    if days[key] < resupply:
        level = "CRITICAL"
    elif days[key] < resupply + 5:
        level = "WATCH"
    else:
        level = "SAFE"
    return {
        "resource": key,
        "label": state["resources"][key]["label"],
        "days": days[key],
        "next_resupply_in_days": resupply,
        "shortfall_days": max(gap, 0),
        "level": level,
    }


def record_history(state, event):
    days = all_days(state)
    state["history"].append({"step": len(state["history"]), "event": event,
                             "survival_days": min(days.values()), **days})


# ---------------------------------------------------------------------------
# 1. Decision engine
# ---------------------------------------------------------------------------

def check_range(name, value, rule, unit):
    """Compare one reading to its ok / inspect range."""
    if rule is None:
        return None  # this sensor does not matter for this shipment type
    c = _check_range(name, value, rule, unit)
    c["range"] = f"{rule['ok'][0]} to {rule['ok'][1]}{unit}"
    c["unit"] = unit.strip()
    return c


def _check_range(name, value, rule, unit):
    if value is None:
        return {"check": name, "value": None, "result": QUARANTINE,
                "reason": f"{name} sensor returned no data - cannot verify the shipment."}
    ok_lo, ok_hi = rule["ok"]
    in_lo, in_hi = rule["inspect"]
    if ok_lo <= value <= ok_hi:
        return {"check": name, "value": value, "result": ACCEPT,
                "reason": f"{name} {value}{unit} is inside the normal range ({ok_lo}-{ok_hi}{unit})."}
    if in_lo <= value <= in_hi:
        return {"check": name, "value": value, "result": INSPECT,
                "reason": f"{name} {value}{unit} is outside normal ({ok_lo}-{ok_hi}{unit}) but within tolerance."}
    return {"check": name, "value": value, "result": QUARANTINE,
            "reason": f"{name} {value}{unit} is far outside the safe limit ({in_lo}-{in_hi}{unit})."}


def check_weight(weight_g, expected_g):
    c = _check_weight(weight_g, expected_g)
    c["range"] = f"{weight_g:g} g of {expected_g} g expected" if weight_g is not None else f"{expected_g} g expected"
    c["unit"] = "%"
    return c


def _check_weight(weight_g, expected_g):
    if weight_g is None:
        return {"check": "Weight", "value": None, "result": QUARANTINE,
                "reason": "Load cell returned no data - cannot confirm contents."}
    ratio = weight_g / expected_g
    pct = round(ratio * 100)
    if ratio > WEIGHT_TOO_HEAVY:
        return {"check": "Weight", "value": pct, "result": INSPECT,
                "reason": f"Package is {pct}% of expected weight - heavier than the manifest."}
    if ratio >= WEIGHT_OK:
        return {"check": "Weight", "value": pct, "result": ACCEPT,
                "reason": f"Package is {pct}% of expected weight."}
    if ratio >= WEIGHT_INSPECT:
        return {"check": "Weight", "value": pct, "result": INSPECT,
                "reason": f"Package is only {pct}% of expected weight - some contents may be missing."}
    return {"check": "Weight", "value": pct, "result": QUARANTINE,
            "reason": f"Package is only {pct}% of expected weight - likely breached or incomplete."}


def check_presence(distance_cm):
    if distance_cm is None:
        return None  # presence sensor is optional
    c = _check_presence(distance_cm)
    c["range"] = f"package within {PRESENCE_MAX_CM} cm"
    c["unit"] = "cm"
    return c


def _check_presence(distance_cm):
    if distance_cm <= PRESENCE_MAX_CM:
        return {"check": "Presence", "value": distance_cm, "result": ACCEPT,
                "reason": f"Package detected on the station ({distance_cm} cm)."}
    return {"check": "Presence", "value": distance_cm, "result": QUARANTINE,
            "reason": f"No package detected ({distance_cm} cm away) - scan is not valid."}


def evaluate_shipment(shipment_type, readings):
    """Run every check. The worst single result becomes the final decision."""
    spec = SHIPMENT_TYPES[shipment_type]
    checks = [
        check_range("Temperature", readings.get("temperature_c"), spec["temperature_c"], " °C"),
        check_range("Humidity", readings.get("humidity_pct"), spec["humidity_pct"], "%"),
        check_weight(readings.get("weight_g"), spec["expected_weight_g"]),
        check_presence(readings.get("distance_cm")),
    ]
    checks = [c for c in checks if c is not None]
    decision = max((c["result"] for c in checks), key=SEVERITY.get)

    # How much usable resource the shipment carries (scaled by weight, max 100%)
    weight = readings.get("weight_g")
    ratio = min(weight / spec["expected_weight_g"], 1.0) if weight else 0.0
    usable = round(spec["payload_amount"] * ratio, 2)

    return {"decision": decision, "checks": checks, "resource": spec["resource"],
            "usable_amount": usable}


# ---------------------------------------------------------------------------
# Applying a scan to the habitat
# ---------------------------------------------------------------------------

def process_scan(state, shipment_type, readings, source="manual"):
    """Evaluate a shipment, update inventory, and report the survival impact."""
    if shipment_type not in SHIPMENT_TYPES:
        raise ValueError(f"Unknown shipment type: {shipment_type}")

    result = evaluate_shipment(shipment_type, readings)
    key = result["resource"]
    spec = SHIPMENT_TYPES[shipment_type]

    before_days = round(days_remaining(state, key), 1)
    before_survival = bottleneck(state)["days"]
    # What WOULD happen if we accepted it (shown even when it is rejected)
    if_accepted_days = round((state["resources"][key]["amount"] + result["usable_amount"])
                             / daily_usage(state, key), 1)

    if result["decision"] == ACCEPT:
        state["resources"][key]["amount"] += result["usable_amount"]

    if source not in ("manual", "preset"):
        state["last_telemetry"] = time.time()  # a real (or fake) ESP32 sent this

    entry = {
        "id": state["next_id"],
        "time": datetime.now().strftime("%H:%M:%S"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "source": source,
        "shipment_type": shipment_type,
        "label": spec["label"],
        "readings": readings,
        **result,
        "status": {ACCEPT: "Added to inventory", INSPECT: "Held for crew inspection",
                   QUARANTINE: "Quarantined - not added"}[result["decision"]],
        "impact": {
            "resource": key,
            "resource_label": state["resources"][key]["label"],
            "before_days": before_days,
            "after_days": round(days_remaining(state, key), 1),
            "if_accepted_days": if_accepted_days,
            "survival_before": before_survival,
            "survival_after": bottleneck(state)["days"],
        },
    }
    state["next_id"] += 1
    state["log"].insert(0, entry)
    if result["decision"] == INSPECT:
        state["pending"].append(entry)
    record_history(state, f"{spec['label']}: {result['decision']}")
    return entry


def resolve_inspection(state, entry_id, approve):
    """Crew finished inspecting a held shipment."""
    entry = next((e for e in state["pending"] if e["id"] == entry_id), None)
    if entry is None:
        raise ValueError("No pending inspection with that id")
    state["pending"].remove(entry)
    if approve:
        state["resources"][entry["resource"]]["amount"] += entry["usable_amount"]
        entry["status"] = "Inspected and approved - added"
    else:
        entry["status"] = "Inspected and rejected"
    entry["impact"]["after_days"] = round(days_remaining(state, entry["resource"]), 1)
    record_history(state, f"Inspection {'approved' if approve else 'rejected'}: {entry['label']}")
    return entry


# ---------------------------------------------------------------------------
# 3. Recommendations
# ---------------------------------------------------------------------------

def apply_action_effects(state, action_id):
    a = ACTIONS[action_id]
    for k, m in a.get("usage_multiplier", {}).items():
        state["usage_multiplier"][k] *= m
    for k, off in a.get("usage_offset", {}).items():
        state["usage_offset"][k] += off
    if "add_backup" in a:
        k = a["add_backup"]
        state["resources"][k]["amount"] += state["resources"][k]["backup_amount"]
        state["backup_used"][k] = True
    state["applied_actions"].append(action_id)


def preview_action(state, action_id):
    """Try the action on a copy of the habitat and measure the change in days."""
    before = all_days(state)
    trial = copy.deepcopy(state)
    apply_action_effects(trial, action_id)
    after = all_days(trial)
    return {k: round(after[k] - before[k], 1) for k in before if abs(after[k] - before[k]) >= 0.05}


def recommend(state):
    """Rank actions that help the bottleneck resource, best first."""
    b = bottleneck(state)
    key = b["resource"]
    recs = []
    for action_id, a in ACTIONS.items():
        if a["for_resource"] != key or action_id in state["applied_actions"]:
            continue
        effect = preview_action(state, action_id)
        gain = effect.get(key, 0)
        is_backup = "add_backup" in a
        recs.append({
            "id": action_id,
            "title": a["title"],
            "why": a["why"],
            "effect_days": effect,
            "gain_days": gain,
            "closes_gap": b["days"] + gain >= b["next_resupply_in_days"],
            "is_backup": is_backup,
        })
    # Prefer non-emergency actions, then the biggest gain
    recs.sort(key=lambda r: (r["is_backup"], -r["gain_days"]))

    # If this resource's shipment was rejected recently, ask for a replacement
    rejected = [e for e in state["log"][:5]
                if e["resource"] == key and e["decision"] == QUARANTINE]
    if rejected:
        recs.insert(0, {
            "id": None,
            "title": f"Request a replacement {rejected[0]['label'].lower()} on the next cargo flight",
            "why": f"Shipment #{rejected[0]['id']} was quarantined, so the expected "
                   f"{rejected[0]['usable_amount']} {state['resources'][key]['unit']} never reached inventory.",
            "effect_days": {}, "gain_days": 0, "closes_gap": False, "is_backup": False,
        })
    return recs


def best_plan(state):
    """
    Greedy recovery plan for the bottleneck: apply the strongest non-emergency
    actions first, and the emergency backup only if still needed, stopping as
    soon as the bottleneck lasts until the next resupply.
    """
    b = bottleneck(state)
    key, goal = b["resource"], b["next_resupply_in_days"]
    if b["days"] >= goal:
        return None  # no gap to close
    candidates = [r for r in recommend(state) if r["id"]]
    trial = copy.deepcopy(state)
    chosen = []
    for r in candidates:  # already ordered: non-emergency first, biggest gain first
        if days_remaining(trial, key) >= goal:
            break
        apply_action_effects(trial, r["id"])
        chosen.append({"id": r["id"], "title": r["title"]})
    before, after = all_days(state), all_days(trial)
    return {
        "resource": key,
        "label": b["label"],
        "actions": chosen,
        "before_days": before[key],
        "after_days": after[key],
        "closes_gap": after[key] >= goal,
        "uses_backup": any(ACTIONS[a["id"]].get("add_backup") for a in chosen),
        # side effects on the other resources (e.g. greenhouse costs energy)
        "side_effects": {k: round(after[k] - before[k], 1) for k in before
                         if k != key and abs(after[k] - before[k]) >= 0.05},
        "new_bottleneck_days": min(after.values()),
    }


def apply_plan(state):
    plan = best_plan(state)
    if not plan:
        raise ValueError("No gap to close - nothing to apply")
    for a in plan["actions"]:
        apply_action_effects(state, a["id"])
    record_history(state, f"Plan applied: {', '.join(a['title'] for a in plan['actions'])}")


def projection(state, horizon=40):
    """Stock of the bottleneck resource day by day: current plan vs. best plan."""
    key = bottleneck(state)["resource"]
    amount, usage = state["resources"][key]["amount"], daily_usage(state, key)
    plan = best_plan(state)
    p_amount, p_usage = amount, usage
    if plan:
        trial = copy.deepcopy(state)
        for a in plan["actions"]:
            apply_action_effects(trial, a["id"])
        p_amount, p_usage = trial["resources"][key]["amount"], daily_usage(trial, key)
    points = []
    for day in range(horizon + 1):
        points.append({
            "day": day,
            "current": round(max(amount - usage * day, 0), 1),
            "plan": round(max(p_amount - p_usage * day, 0), 1) if plan else None,
        })
    return {"resource": key, "label": state["resources"][key]["label"],
            "unit": state["resources"][key]["unit"], "points": points}


def apply_action(state, action_id):
    if action_id not in ACTIONS:
        raise ValueError("Unknown action")
    if action_id in state["applied_actions"]:
        raise ValueError("Action already applied")
    apply_action_effects(state, action_id)
    record_history(state, f"Action: {ACTIONS[action_id]['title']}")


# ---------------------------------------------------------------------------
# Snapshot for the dashboard
# ---------------------------------------------------------------------------

def snapshot(state):
    resources = []
    for k, r in state["resources"].items():
        resources.append({
            "key": k, "label": r["label"], "unit": r["unit"],
            "amount": round(r["amount"], 1),
            "daily_usage": round(daily_usage(state, k), 2),
            "days": round(days_remaining(state, k), 1),
            "backup_amount": r["backup_amount"],
            "backup_used": state["backup_used"][k],
        })
    last = state.get("last_telemetry")
    seconds = round(time.time() - last) if last else None
    return {
        "mission": state["mission"],
        "resources": resources,
        "bottleneck": bottleneck(state),
        "recommendations": recommend(state),
        "plan": best_plan(state),
        "projection": projection(state),
        "station": {"last_packet_seconds_ago": seconds,
                    "online": seconds is not None and seconds < 60},
        "log": state["log"][:15],
        "pending": state["pending"],
        "history": state["history"],
        "applied_actions": [{"id": a, "title": ACTIONS[a]["title"]} for a in state["applied_actions"]],
        "armed_type": state["armed_type"],
        "shipment_types": {k: {"label": v["label"], "resource": v["resource"],
                               "expected_weight_g": v["expected_weight_g"]}
                           for k, v in SHIPMENT_TYPES.items()},
        "scenarios": SCENARIOS,
        "assumptions": HABITAT["assumptions"],
    }
