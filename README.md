# HabitatGuard

**Smart space-habitat supply-intake and survival decision system**

> Team: **[TEAM NAME]** · LSU Hackathon 2026 · Prompt **#[N]**
> *"Create a system that helps humans sustain life in extreme off-Earth environments."*

> ⚠️ Before submitting: reorganize these sections to match the official README template linked in the submission rules.

## The problem

On a Moon or Mars base, every cargo delivery matters. A food crate that overheated in transit or a filter kit that arrived damaged isn't just a bad package — it changes how many days the crew can survive before the next resupply.

## What HabitatGuard does

Every incoming shipment goes through a small **intake station** (ESP32 + sensors) before the crew uses it. HabitatGuard:

1. **Screens the shipment** — temperature, humidity, weight vs. manifest, package presence.
2. **Decides** — ✅ **Accept** (added to inventory), 🟡 **Inspect** (held for the crew), 🔴 **Quarantine** (not added) — and explains why.
3. **Shows the consequence** — recalculates days of food, water, oxygen and energy, and the crew's survival time.
4. **Finds the bottleneck** — the resource that runs out first, compared with the next resupply date.
5. **Recommends what to do** — ranked recovery actions (ration, greenhouse, repairs, backups) with their predicted effect in days, including side effects on other resources.

> HabitatGuard doesn't only detect a bad supply. It shows how that supply decision affects crew survival time and recommends what to do next.

This is a **HACCP-inspired supply-risk screening prototype**, not a certified food-safety system.

## Demo flow (2 minutes)

1. Start: food lasts **24 days**, resupply is in **28** → food is the CRITICAL bottleneck.
2. *Overheated food shipment* → **Quarantined** (42 °C). Food stays at 24 days. The dashboard shows it would have been 30.
3. *Normal food shipment* → **Accepted**. Food goes **24 → 30 days**; status moves to WATCH.
4. *Slightly warm food shipment* → **Inspect**. Crew approves or rejects it from the dashboard.
5. Apply a recommendation (e.g. *Prioritize greenhouse*) and watch food go up while energy goes down.
6. Place a real package on the ESP32 station → the decision appears on the dashboard and the station LED lights green / yellow / red.

## Decision rules

| Check | Accept | Inspect | Quarantine |
|---|---|---|---|
| Temperature / humidity | inside the normal range | outside normal, inside tolerance | outside tolerance |
| Weight (vs. expected) | 90 – 110 % | 75 – 90 % or > 110 % | < 75 % |
| Required sensor | has data | — | **missing data** |
| Presence (optional) | package ≤ 15 cm | — | no package |

The **worst** single check decides the shipment. Ranges per shipment type are in `data/shipment_types.json`.

## Survival model

```
daily_usage    = usage_per_crew_per_day × crew_size × usage_multiplier + usage_offset
days_remaining = current_amount / daily_usage
bottleneck     = resource with the fewest days
shortfall      = next_resupply_day − bottleneck_days
```

An accepted shipment adds `payload_amount × min(weight / expected_weight, 1)`. Actions change `usage_multiplier`, `usage_offset`, or move a backup reserve into the main supply. Every recommendation is previewed on a copy of the habitat state so its effect in days is calculated, not guessed.

## Tech stack

| Part | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4, Recharts, Lucide icons |
| Backend | Python, FastAPI (in-memory state) |
| Data | Local JSON files in `data/` |
| Hardware | ESP32, DHT22, HX711 load cell, HC-SR04 ultrasonic, 3 LEDs |

**External APIs used: 0.** (Google Fonts is loaded only as a stylesheet for typography.)

## Project structure

```
habitatguard/
├── data/                 # all numbers live here - edit without touching code
│   ├── habitat.json        # crew, starting supplies, daily usage, backups, assumptions
│   ├── shipment_types.json # sensor thresholds + expected weight per shipment type
│   ├── scenarios.json      # preset demo scans
│   └── actions.json        # recovery actions and their effects
├── backend/
│   ├── engine.py           # decision engine, survival model, recommendations (no web code)
│   ├── app.py              # FastAPI routes
│   └── requirements.txt
├── frontend/             # React dashboard
│   └── src/
│       ├── App.jsx           # layout + polling every 2 s
│       ├── api.js            # all backend calls
│       └── components/       # one file per panel
└── esp32/
    ├── habitatguard_intake/habitatguard_intake.ino  # station firmware
    └── fake_esp32.py         # test the hardware path without hardware
```

## Running it

The dashboard is already built (`frontend/dist`), so running the demo only needs **Python 3.10+**. No Node.js needed.

### 1. Get the code

```bash
git clone https://github.com/maiviettantran/habitatguard.git
cd habitatguard
```
No git? On the GitHub page click **Code → Download ZIP**, then unzip it.

### 2. Start it

**Windows:** double-click `RUN_HABITATGUARD.bat`. It installs the Python packages, starts the server and opens the dashboard. Close the "HabitatGuard server" window to stop it.

**Mac / Linux:**
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000
```
Then open **http://localhost:8000**.

### 3. Try the demo

Click **Simulate scan** and run: *Overheated food* → *Normal food* → *Slightly warm food* (then **Approve**) → **Apply plan**. **Reset mission** in the sidebar starts over.

### Editing the dashboard (developers, needs Node 18+)

```bash
# terminal 1: backend as above
# terminal 2:
cd frontend
npm install
npm run dev        # live-reload at http://localhost:5173
npm run build      # when done: updates frontend/dist, commit it
```

**3. Hardware (optional)**
- Install the three Arduino libraries listed at the top of the `.ino` file.
- Set Wi-Fi name, password and `SERVER_URL` (the laptop's IP on the same network, port 8000).
- Keep the station empty at power-on (the scale tares itself).
- On the dashboard, choose what the station **expects next** (food, water, …), then place the package.
- No hardware? `python esp32/fake_esp32.py --temp 41` sends the same JSON.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | Full dashboard state |
| POST | `/api/scenarios/{id}` | Run a preset scenario |
| POST | `/api/scan` | Manual scan `{shipment_type, readings}` |
| POST | `/api/telemetry` | ESP32 reading → `{decision, led}` |
| POST | `/api/manifest` | Set what the station expects next |
| POST | `/api/inspections/{id}` | `{approve: true/false}` |
| POST | `/api/actions/{id}` | Apply a recovery action |
| POST | `/api/plan/apply` | Apply the whole recommended plan |
| POST | `/api/reset` | Restart the mission |

Example telemetry:
```json
{ "device_id": "esp32-intake-1", "temperature_c": 21.4, "humidity_pct": 44, "weight_g": 497, "distance_cm": 7 }
```

## Data & assumptions

- Per-crew usage (food ≈ 1.8 kg, drinking water ≈ 2.5 L, oxygen ≈ 0.84 kg per day) is rounded from NASA's *Life Support Baseline Values and Assumptions Document (BVAD)*.
- Energy use (20 kWh/day) and action effects (greenhouse yield, repair savings) are prototype assumptions.
- `expected_weight_g` is the weight of the physical demo prop; `payload_amount` is the real-scale cargo it represents.

## Team

| Name | Role |
|---|---|
| [Name] | Electrical — ESP32, sensors, LEDs, Wi-Fi |
| [Name] | Computer — React dashboard |
| [Name] | Computer — backend / API, ESP32 integration |
| [Name] | Computer — testing, deployment |
| [Name] | Industrial — decision rules, inventory & survival model, bottleneck analysis, recommendations, pitch |

## AI usage disclosure

Per the hackathon AI policy: parts of this codebase were **generated with AI assistance (Claude, by Anthropic)** during the hackathon, including the initial version of the backend engine, FastAPI routes, React components, ESP32 sketch and this README. The team reviewed, tested and edited all code and can explain every file. No AI-generated images or video were used; the logo is a hand-written SVG and the starfield is pure CSS.

## Image credits

- `frontend/public/earthrise.jpg`: "Earthrise" (Apollo 8, AS08-14-2383), Image Credit: NASA/William Anders. A real photograph from NASA, not AI-generated. Source: https://www.nasa.gov/?p=582699
- The logo, icons (Lucide) and the space background are drawn in code.

## Boilerplate sources

- Project structure follows the default Vite + React setup (https://vite.dev).
- Tailwind CSS v4 Vite plugin setup from the Tailwind docs (https://tailwindcss.com/docs/installation/using-vite).
