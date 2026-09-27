// robin.ino - "Robin", a routine-aware care robot inspired by Tinybots' Tessa.
// Board: Arduino UNO R4 WiFi (an UNO WiFi Rev2 also compiles, but has no LED face).
//
// This sketch is the SENSING + ACTING edge of the smart system. It is deliberately "dumb":
// it measures, reports, and obeys. All decisions and all learning happen in the Python backend.
//
//  1. Samples sensors 10x per second: PIR motion (A1), light (A0), YES/NO buttons (D2/D3).
//  2. Every 2 s publishes one telemetry JSON message       -> robin/<id>/telemetry  (QoS 0)
//  3. Publishes button presses immediately                  -> robin/<id>/event      (QoS 1)
//  4. Obeys plain-text commands from the Python "brain"     <- robin/<id>/cmd
//        say <track> [ms]  play voice file NN and show the talking face for ms
//        ask <track> [ms]  same, then show the "ask" face until a button is pressed
//        face <mood>       happy | blink | talk | ask | concern | sleep | yes | no | offline
//        vol <0-30>        speaker volume
//        stop              stop audio
//        ping <token>      reply <token> on robin/<id>/pong (used to measure latency)
//  5. Stays alive on its own: reconnects WiFi/MQTT, retained "online" status + Last Will "offline",
//     and keeps button presses in a small queue while offline so answers are not lost.
//
// Testing without a network: set SECRET_WIFI_SSID to "" and type the same commands in the
// Serial Monitor (115200 baud, "Newline"). Extra serial-only commands: raw, help.

#include "arduino_secrets.h"
#include <ArduinoMqttClient.h>
#if defined(ARDUINO_UNOWIFIR4)
  #include <WiFiS3.h>
  #include "Arduino_LED_Matrix.h"
  #define HAS_MATRIX 1
#else
  #include <WiFiNINA.h>
  #define HAS_MATRIX 0
#endif
#include "voice.h"
#include "face.h"

#define FIRMWARE_VERSION "1.0.0"

// ---------- Pins ----------
const uint8_t PIN_LIGHT   = A0;  // LDR voltage divider: brighter room -> higher value
const uint8_t PIN_PIR     = A1;  // PIR output is 3.3 V, read as ANALOG (see docs/04_assembly.md)
const uint8_t PIN_BTN_YES = 2;   // green button to GND, internal pull-up -> pressed = LOW
const uint8_t PIN_BTN_NO  = 3;   // red button to GND, internal pull-up -> pressed = LOW
// D0 (RX) / D1 (TX) = Serial1 -> DFR0534 voice module

// ---------- Tunables ----------
const unsigned long SAMPLE_MS        = 100;   // sensor sampling period (10 Hz)
const unsigned long PUBLISH_MS       = 2000;  // telemetry period
const int           PIR_THRESHOLD    = 400;   // 0-1023: PIR HIGH (3.3 V) reads ~675, LOW ~0
const unsigned long DEBOUNCE_MS      = 40;    // button contacts bounce for a few ms
const unsigned long RECONNECT_MS     = 5000;  // wait between reconnect attempts
const unsigned long LINK_CHECK_MS    = 1000;  // how often we ask "are we still online?"
const unsigned long KEEPALIVE_MS     = 15000; // broker declares us dead after ~1.5x this
const uint8_t       DEFAULT_VOLUME   = 20;    // 0-30; keep <= 22 for the 1 W speaker

// ---------- Objects ----------
WiFiClient wifiClient;
MqttClient mqtt(wifiClient);
Voice voice(Serial1);
#if HAS_MATRIX
ArduinoLEDMatrix matrix;
#endif

String topicTelemetry, topicEvent, topicStatus, topicCmd, topicPong;
unsigned long bootId;                // random number per power-up: lets the backend spot reboots

// ---------- Connection state ----------
const bool NETWORK_ENABLED = strlen(SECRET_WIFI_SSID) > 0;  // "" = offline test mode
bool online = false;
unsigned long lastLinkCheck = 0, lastReconnectTry = 0;
bool triedOnce = false;

// ---------- Telemetry accumulators (reset every PUBLISH_MS) ----------
unsigned long seq = 0;
unsigned long lastSample = 0, lastPublish = 0;
uint16_t samples = 0, pirHighSamples = 0, pirEdges = 0;
uint32_t lightSum = 0;
bool lastPir = false;

// ---------- Commands (copied in the MQTT callback, executed in loop) ----------
char cmdBuffer[64];
bool cmdReady = false;
char serialLine[64];
uint8_t serialLen = 0;

// ---------- Face ----------
Mood baseMood = HAPPY, overlayMood = HAPPY, shownMood = MOOD_COUNT;
unsigned long overlayUntil = 0, nextBlink = 0;
bool askAfterTalk = false;

// ---------- Buttons ----------
struct Button {
  uint8_t pin;
  const char *name;
  Mood feedback;
  bool stable;
  bool lastRaw;
  unsigned long changedAt;
};
Button buttons[] = {
  {PIN_BTN_YES, "yes", YES, HIGH, HIGH, 0},
  {PIN_BTN_NO,  "no",  NO,  HIGH, HIGH, 0},
};

// ---------- Offline event queue (ring buffer) ----------
struct PendingEvent {
  unsigned long eseq;
  unsigned long ms;
  char type[8];
  char value[8];
};
const uint8_t QUEUE_SIZE = 8;
PendingEvent eventQueue[QUEUE_SIZE];
uint8_t queueHead = 0, queueCount = 0;
unsigned long eventSeq = 0;

// =====================================================================================
void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println(F("\nRobin firmware " FIRMWARE_VERSION));

  pinMode(PIN_BTN_YES, INPUT_PULLUP);
  pinMode(PIN_BTN_NO, INPUT_PULLUP);

  randomSeed(analogRead(A2) ^ micros());
  bootId = random(1, 1000000);

  String base = String("robin/") + SECRET_DEVICE_ID;
  topicTelemetry = base + "/telemetry";
  topicEvent     = base + "/event";
  topicStatus    = base + "/status";
  topicCmd       = base + "/cmd";
  topicPong      = base + "/pong";

#if HAS_MATRIX
  matrix.begin();
#endif
  drawFace(OFFLINE);

  Serial1.begin(9600);  // DFR0534 voice module
  delay(500);           // give the module time to boot
  voice.setVolume(DEFAULT_VOLUME);
  voice.playTrack(1);   // "Hello, I'm Robin": an audible self-test on every boot

  mqtt.onMessage(onMqttMessage);
  sendEvent("boot", FIRMWARE_VERSION);  // queued until we are online
  if (!NETWORK_ENABLED) Serial.println(F("Offline test mode: type 'help' in the Serial Monitor."));
}

void loop() {
  unsigned long now = millis();

  keepConnected(now);
  mqtt.poll();  // receive commands + send MQTT keep-alive pings

  if (cmdReady) {
    handleCommand(cmdBuffer);
    cmdReady = false;
  }
  readSerialCommand();
  if (now - lastSample >= SAMPLE_MS) {
    lastSample = now;
    sampleSensors();
  }
  readButtons(now);
  if (now - lastPublish >= PUBLISH_MS) {
    lastPublish = now;
    publishTelemetry();
  }
  updateFace(now);
}

// =====================================================================================
// Connectivity
// =====================================================================================
void keepConnected(unsigned long now) {
  if (!NETWORK_ENABLED) return;
  if (now - lastLinkCheck < LINK_CHECK_MS) return;
  lastLinkCheck = now;

  online = (WiFi.status() == WL_CONNECTED) && mqtt.connected();
  if (online) return;
  if (triedOnce && now - lastReconnectTry < RECONNECT_MS) return;
  triedOnce = true;
  lastReconnectTry = now;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.print(F("[wifi] connecting to "));
    Serial.println(SECRET_WIFI_SSID);
    WiFi.begin(SECRET_WIFI_SSID, SECRET_WIFI_PASS);  // blocks a few seconds
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("[wifi] failed, will retry"));
      return;
    }
    Serial.print(F("[wifi] connected, IP "));
    Serial.println(WiFi.localIP());
  }
  online = connectMqtt();
}

bool connectMqtt() {
  Serial.print(F("[mqtt] connecting to "));
  Serial.print(SECRET_MQTT_HOST);
  Serial.print(':');
  Serial.println(SECRET_MQTT_PORT);

  mqtt.setId(SECRET_DEVICE_ID);
  if (strlen(SECRET_MQTT_USER) > 0) mqtt.setUsernamePassword(SECRET_MQTT_USER, SECRET_MQTT_PASS);
  mqtt.setKeepAliveInterval(KEEPALIVE_MS);
  mqtt.setConnectionTimeout(5000);

  // Last Will: if we vanish (power cut, WiFi gone), the BROKER publishes "offline" for us.
  mqtt.beginWill(topicStatus, true, 1);
  mqtt.print("offline");
  mqtt.endWill();

  if (!mqtt.connect(SECRET_MQTT_HOST, SECRET_MQTT_PORT)) {
    Serial.print(F("[mqtt] failed, error "));
    Serial.println(mqtt.connectError());
    return false;
  }
  mqtt.subscribe(topicCmd, 1);
  publish(topicStatus, "online", true, 1);
  Serial.println(F("[mqtt] connected"));
  flushEventQueue();
  return true;
}

bool publish(const String &topic, const char *payload, bool retain, uint8_t qos) {
  if (!mqtt.connected()) return false;
  if (!mqtt.beginMessage(topic, (unsigned long)strlen(payload), retain, qos)) return false;
  mqtt.print(payload);
  return mqtt.endMessage() == 1;
}

// Runs inside mqtt.poll(). We only copy the text here and act on it later in loop().
void onMqttMessage(int size) {
  (void)size;
  int n = 0;
  while (mqtt.available() && n < (int)sizeof(cmdBuffer) - 1) cmdBuffer[n++] = (char)mqtt.read();
  cmdBuffer[n] = '\0';
  while (mqtt.available()) mqtt.read();  // drop anything too long
  cmdReady = true;
}

// =====================================================================================
// Commands from the brain
// =====================================================================================
void handleCommand(char *text) {
  Serial.print(F("[cmd] "));
  Serial.println(text);

  char *cmd = strtok(text, " ");
  char *arg1 = strtok(NULL, " ");
  char *arg2 = strtok(NULL, " ");
  if (cmd == NULL) return;

  if (strcmp(cmd, "say") == 0 || strcmp(cmd, "ask") == 0) {
    int track = arg1 ? atoi(arg1) : 0;
    if (track < 1 || track > 99) return;
    unsigned long talkMs = arg2 ? strtoul(arg2, NULL, 10) : 3000;
    voice.playTrack(track);
    showOverlay(TALK, talkMs);
    askAfterTalk = (cmd[0] == 'a');
  } else if (strcmp(cmd, "face") == 0 && arg1) {
    Mood mood = moodFromName(arg1);
    if (mood != MOOD_COUNT) {
      baseMood = mood;
      overlayUntil = 0;
    }
  } else if (strcmp(cmd, "vol") == 0 && arg1) {
    voice.setVolume(atoi(arg1));
  } else if (strcmp(cmd, "stop") == 0) {
    voice.stop();
    overlayUntil = 0;
  } else if (strcmp(cmd, "ping") == 0) {
    publish(topicPong, arg1 ? arg1 : "", false, 0);
  } else if (strcmp(cmd, "raw") == 0) {
    printRawReadings();
  } else if (strcmp(cmd, "help") == 0) {
    Serial.println(F("Commands: say <n> [ms] | ask <n> [ms] | face <mood> | vol <0-30> | stop | raw"));
    Serial.println(F("Moods: happy blink talk ask concern sleep yes no offline"));
  }
}

// Same commands, typed in the Serial Monitor (line ending: "Newline").
void readSerialCommand() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      serialLine[serialLen] = '\0';
      if (serialLen > 0) handleCommand(serialLine);
      serialLen = 0;
    } else if (serialLen < sizeof(serialLine) - 1) {
      serialLine[serialLen++] = c;
    }
  }
}

// 2 seconds of raw ADC values: use this to check the wiring and the PIR threshold.
void printRawReadings() {
  for (int i = 0; i < 20; i++) {
    Serial.print(F("pir_raw="));
    Serial.print(analogRead(PIN_PIR));
    Serial.print(F(" (HIGH if > "));
    Serial.print(PIR_THRESHOLD);
    Serial.print(F(")  light_raw="));
    Serial.print(analogRead(PIN_LIGHT));
    Serial.print(F("  yes="));
    Serial.print(digitalRead(PIN_BTN_YES) == LOW ? F("pressed") : F("-"));
    Serial.print(F("  no="));
    Serial.println(digitalRead(PIN_BTN_NO) == LOW ? F("pressed") : F("-"));
    delay(100);
  }
}

// =====================================================================================
// Sensors
// =====================================================================================
void sampleSensors() {
  bool pir = analogRead(PIN_PIR) > PIR_THRESHOLD;
  if (pir && !lastPir) pirEdges++;  // rising edge = a new movement was detected
  if (pir) pirHighSamples++;
  lastPir = pir;

  lightSum += analogRead(PIN_LIGHT);
  samples++;
}

void publishTelemetry() {
  if (samples == 0) return;
  char json[160];
  snprintf(json, sizeof(json),
           "{\"boot\":%lu,\"seq\":%lu,\"ms\":%lu,\"n\":%u,\"pir\":%d,\"edges\":%u,"
           "\"high_ms\":%lu,\"light\":%lu,\"rssi\":%ld}",
           bootId, seq, millis(), samples, lastPir ? 1 : 0, pirEdges,
           (unsigned long)pirHighSamples * SAMPLE_MS, (unsigned long)(lightSum / samples),
           (long)WiFi.RSSI());
  seq++;  // counts up even when sending fails, so the backend can measure message loss
  bool sent = publish(topicTelemetry, json, false, 0);
  Serial.print(sent ? F("[tx] ") : F("[tx-failed] "));
  Serial.println(json);

  samples = pirHighSamples = pirEdges = 0;
  lightSum = 0;
}

void readButtons(unsigned long now) {
  for (Button &b : buttons) {
    bool raw = digitalRead(b.pin);
    if (raw != b.lastRaw) {
      b.lastRaw = raw;
      b.changedAt = now;
    }
    if (raw != b.stable && now - b.changedAt >= DEBOUNCE_MS) {
      b.stable = raw;
      if (b.stable == LOW) onButtonPressed(b);
    }
  }
}

void onButtonPressed(Button &b) {
  Serial.print(F("[button] "));
  Serial.println(b.name);
  showOverlay(b.feedback, 1500);  // instant local feedback: check mark or cross
  askAfterTalk = false;
  if (baseMood == ASK) baseMood = HAPPY;
  sendEvent("button", b.name);
}

// =====================================================================================
// Events (QoS 1, queued while offline)
// =====================================================================================
void sendEvent(const char *type, const char *value) {
  PendingEvent e;
  e.eseq = ++eventSeq;
  e.ms = millis();
  strncpy(e.type, type, sizeof(e.type) - 1);
  e.type[sizeof(e.type) - 1] = '\0';
  strncpy(e.value, value, sizeof(e.value) - 1);
  e.value[sizeof(e.value) - 1] = '\0';
  if (!publishEvent(e)) enqueueEvent(e);
}

bool publishEvent(const PendingEvent &e) {
  char json[140];
  // age_ms = how long ago it happened, so the backend can reconstruct the real time
  snprintf(json, sizeof(json),
           "{\"boot\":%lu,\"eseq\":%lu,\"ms\":%lu,\"age_ms\":%lu,\"type\":\"%s\",\"value\":\"%s\"}",
           bootId, e.eseq, e.ms, millis() - e.ms, e.type, e.value);
  return publish(topicEvent, json, false, 1);
}

void enqueueEvent(const PendingEvent &e) {
  if (queueCount == QUEUE_SIZE) {  // full: forget the oldest
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    queueCount--;
  }
  eventQueue[(queueHead + queueCount) % QUEUE_SIZE] = e;
  queueCount++;
  Serial.print(F("[queue] events waiting: "));
  Serial.println(queueCount);
}

void flushEventQueue() {
  while (queueCount > 0 && publishEvent(eventQueue[queueHead])) {
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    queueCount--;
  }
}

// =====================================================================================
// Face
// =====================================================================================
void showOverlay(Mood mood, unsigned long ms) {
  overlayMood = mood;
  overlayUntil = millis() + ms;
}

void updateFace(unsigned long now) {
  Mood mood;
  if (NETWORK_ENABLED && !online) {
    mood = OFFLINE;
  } else if (overlayUntil != 0 && (long)(now - overlayUntil) < 0) {
    mood = overlayMood;
  } else {
    if (overlayUntil != 0) {  // an overlay just ended
      overlayUntil = 0;
      if (askAfterTalk) {
        baseMood = ASK;
        askAfterTalk = false;
      }
    }
    mood = baseMood;
    if (mood == HAPPY) {  // blink like Tessa: 150 ms every 3-6 s
      long sinceBlink = (long)(now - nextBlink);
      if (sinceBlink >= 150) nextBlink = now + random(3000, 6000);
      else if (sinceBlink >= 0) mood = BLINK;
    }
  }
  if (mood != shownMood) {
    drawFace(mood);
    shownMood = mood;
  }
}

void drawFace(Mood mood) {
#if HAS_MATRIX
  static uint8_t frame[8][12];  // the library wants a writable buffer, FACES is read-only
  memcpy(frame, FACES[mood], sizeof(frame));
  matrix.renderBitmap(frame, 8, 12);
#else
  (void)mood;
#endif
}
