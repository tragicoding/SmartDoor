#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "servo_ctrl.h"
#include "lcd_display.h"
#include "audio.h"
#include "mqtt_handler.h"

static WiFiClient    wifiClient;
static PubSubClient  mqttClient(wifiClient);

static const String topicDoorSensed = "door/"    + String(SENSOR_ID) + "/sensed";
static const String topicSpeakerCmd = "speaker/" + String(DEVICE_ID) + "/cmd";
static const String topicBoxCmd     = "box/"     + String(DEVICE_ID) + "/cmd";
static const String topicBinStatus  = "bin/"     + String(DEVICE_ID) + "/status";

// ── 내부 핸들러 ──────────────────────────────────────────────────────────────

static void handleSpeakerCommand(const JsonDocument& doc) {
    const char* type = doc["type"] | "";
    const char* text = doc["text"] | "";
    const char* url  = doc["url"]  | "";

    bool isTts = strcmp(type, "tts") == 0 || strcmp(type, "tts_audio") == 0;
    if (!isTts) {
        Serial.println("[Speaker] Unknown type, ignore");
        return;
    }

    if (strlen(text) > 0) showTextOnLCD(String(text));

    if (strlen(url) > 0) {
        playTTSAudio(String(url));
    } else {
        Serial.println("[Speaker] No audio URL in payload");
    }
}

static void handleBoxCommand(const JsonDocument& doc) {
    const char* act      = doc["act"]      | "";
    long        closeInMs = doc["close_in"] | 10000;

    Serial.printf("[Box] act=%s close_in=%ld\n", act, closeInMs);

    if (strcmp(act, "open") == 0) {
        openUmbrella(closeInMs);
        publishBinStatus(true);
    } else if (strcmp(act, "close") == 0) {
        closeUmbrella();
        publishBinStatus(false);
    } else {
        Serial.println("[Box] Unknown act");
    }
}

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String topicStr(topic);
    String payloadStr;
    payloadStr.reserve(length + 1);
    for (unsigned int i = 0; i < length; i++) payloadStr += (char)payload[i];

    Serial.print("[MQTT] ");
    Serial.print(topicStr);
    Serial.print(" => ");
    Serial.println(payloadStr);

    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payloadStr);
    if (err) {
        Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
        return;
    }

    if      (topicStr == topicSpeakerCmd) handleSpeakerCommand(doc);
    else if (topicStr == topicBoxCmd)     handleBoxCommand(doc);
}

static void connectMQTT() {
    while (!mqttClient.connected()) {
        Serial.print("[MQTT] Connecting... ");
        String clientId = "esp32-doorbin-" + String(DEVICE_ID);

        bool ok = (strlen(MQTT_USER) == 0)
            ? mqttClient.connect(clientId.c_str())
            : mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);

        if (ok) {
            Serial.println("connected");
            mqttClient.subscribe(topicSpeakerCmd.c_str());
            mqttClient.subscribe(topicBoxCmd.c_str());
            Serial.printf("[MQTT] Subscribed: %s, %s\n",
                topicSpeakerCmd.c_str(), topicBoxCmd.c_str());
        } else {
            Serial.printf("[MQTT] Failed rc=%d, retry in 5s\n", mqttClient.state());
            delay(5000);
        }
    }
}

// ── 공개 API ─────────────────────────────────────────────────────────────────

void initMqtt() {
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    connectMQTT();
}

void mqttLoop() {
    if (!mqttClient.connected()) connectMQTT();
    mqttClient.loop();
}

void publishDoorSensed() {
    StaticJsonDocument<128> doc;
    doc["user_id"]   = USER_ID;
    doc["sensor_id"] = SENSOR_ID;
    doc["ts"]        = (uint32_t)(millis() / 1000);

    char   buf[128];
    size_t n = serializeJson(doc, buf);
    bool   ok = mqttClient.publish(topicDoorSensed.c_str(), buf, n);
    Serial.printf("[MQTT] publish %s => %s\n", topicDoorSensed.c_str(), ok ? "OK" : "FAIL");
}

void publishBinStatus(bool isOpen) {
    StaticJsonDocument<128> doc;
    doc["device_id"] = DEVICE_ID;
    doc["remain"]    = BIN_REMAIN;
    doc["cap"]       = BIN_CAPACITY;
    doc["is_open"]   = isOpen;

    char   buf[128];
    size_t n = serializeJson(doc, buf);
    bool   ok = mqttClient.publish(topicBinStatus.c_str(), buf, n);
    Serial.printf("[MQTT] publish %s => %s\n", topicBinStatus.c_str(), ok ? "OK" : "FAIL");
}
