/*
  HabitatGuard intake station (ESP32)

  Reads temperature/humidity (DHT22), weight (HX711 load cell) and distance
  (HC-SR04 ultrasonic). When a package is placed on the station, it sends
  one JSON reading to the backend and lights the LED the server answers with.

  Libraries (Arduino Library Manager):
    - "DHT sensor library" by Adafruit (+ "Adafruit Unified Sensor")
    - "HX711" by Bogdan Necula
    - "ArduinoJson" by Benoit Blanchon (v7)

  Edit the CONFIG section, upload, and open Serial Monitor at 115200.
  Any sensor you do not have: set its USE_ flag to false and it is sent as null.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HX711.h>

// ---------------- CONFIG ----------------
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
// Laptop running the backend (find with ipconfig / ifconfig). Same Wi-Fi as the ESP32!
const char* SERVER_URL = "http://192.168.1.50:8000/api/telemetry";

const bool USE_DHT = true;
const bool USE_SCALE = true;
const bool USE_ULTRASONIC = true;

const int DHT_PIN = 4;
const int HX_DOUT = 16, HX_SCK = 17;
const int TRIG_PIN = 5, ECHO_PIN = 18;
const int LED_GREEN = 25, LED_YELLOW = 26, LED_RED = 27;

float SCALE_CALIBRATION = 420.0;  // change after calibrating with a known weight
const float PRESENT_CM = 15.0;    // package counts as "on the station" closer than this
const float PRESENT_GRAMS = 50.0; // fallback when there is no ultrasonic sensor
// ----------------------------------------

DHT dht(DHT_PIN, DHT22);
HX711 scale;
bool packageWasPresent = false;

void setLeds(bool g, bool y, bool r) {
  digitalWrite(LED_GREEN, g);
  digitalWrite(LED_YELLOW, y);
  digitalWrite(LED_RED, r);
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long us = pulseIn(ECHO_PIN, HIGH, 30000);  // 30 ms timeout
  if (us == 0) return NAN;
  return us * 0.0343 / 2.0;
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.print("\nConnected. ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// Put a float into JSON, or null if the sensor failed (NaN)
void putReading(JsonDocument& doc, const char* key, float v) {
  if (isnan(v)) doc[key] = nullptr; else doc[key] = v;
}

void sendReading(float tempC, float hum, float grams, float cm) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  JsonDocument doc;
  doc["device_id"] = "esp32-intake-1";
  putReading(doc, "temperature_c", tempC);
  putReading(doc, "humidity_pct", hum);
  putReading(doc, "weight_g", grams);
  putReading(doc, "distance_cm", cm);
  String body;
  serializeJson(doc, body);
  Serial.println("Sending: " + body);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);

  if (code == 200) {
    JsonDocument reply;
    deserializeJson(reply, http.getString());
    String led = reply["led"] | "RED";
    Serial.println("Decision: " + String((const char*)(reply["decision"] | "?")));
    setLeds(led == "GREEN", led == "YELLOW", led == "RED");
  } else {
    Serial.printf("Server error %d - blinking red\n", code);
    for (int i = 0; i < 6; i++) { setLeds(false, false, i % 2 == 0); delay(200); }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_GREEN, OUTPUT); pinMode(LED_YELLOW, OUTPUT); pinMode(LED_RED, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  setLeds(true, true, true); delay(300); setLeds(false, false, false);  // LED self-test

  if (USE_DHT) dht.begin();
  if (USE_SCALE) {
    scale.begin(HX_DOUT, HX_SCK);
    scale.set_scale(SCALE_CALIBRATION);
    scale.tare();  // station must be EMPTY at power-on
  }
  connectWiFi();
}

void loop() {
  float cm = USE_ULTRASONIC ? readDistanceCm() : NAN;
  float grams = (USE_SCALE && scale.is_ready()) ? scale.get_units(5) : NAN;

  bool present = USE_ULTRASONIC ? (!isnan(cm) && cm <= PRESENT_CM)
                                : (!isnan(grams) && grams >= PRESENT_GRAMS);

  // Send ONE reading when a package arrives, not every loop
  if (present && !packageWasPresent) {
    delay(1500);  // let the scale settle
    grams = USE_SCALE ? scale.get_units(10) : NAN;
    float t = USE_DHT ? dht.readTemperature() : NAN;
    float h = USE_DHT ? dht.readHumidity() : NAN;
    sendReading(t, h, grams, cm);
  }
  if (!present && packageWasPresent) {
    setLeds(false, false, false);  // package removed -> ready for next
  }
  packageWasPresent = present;
  delay(300);
}
