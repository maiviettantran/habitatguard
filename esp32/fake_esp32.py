"""
Pretend to be the ESP32 - test the hardware path with no hardware.

    python esp32/fake_esp32.py                 # normal package
    python esp32/fake_esp32.py --temp 41       # overheated
    python esp32/fake_esp32.py --weight 300    # underweight
    python esp32/fake_esp32.py --no-humidity   # broken sensor

Uses only the Python standard library.
"""
import argparse
import json
import urllib.request

p = argparse.ArgumentParser()
p.add_argument("--url", default="http://localhost:8000/api/telemetry")
p.add_argument("--temp", type=float, default=19.5)
p.add_argument("--humidity", type=float, default=42)
p.add_argument("--no-humidity", action="store_true")
p.add_argument("--weight", type=float, default=497)
p.add_argument("--distance", type=float, default=7)
a = p.parse_args()

payload = {
    "device_id": "fake-esp32",
    "temperature_c": a.temp,
    "humidity_pct": None if a.no_humidity else a.humidity,
    "weight_g": a.weight,
    "distance_cm": a.distance,
}
req = urllib.request.Request(a.url, data=json.dumps(payload).encode(),
                             headers={"Content-Type": "application/json"})
print("Sent:   ", payload)
print("Server: ", json.loads(urllib.request.urlopen(req).read()))
