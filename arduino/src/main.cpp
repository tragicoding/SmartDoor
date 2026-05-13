#include <Arduino.h>
#include "config.h"
#include "wifi_manager.h"
#include "mqtt_handler.h"
#include "sensor.h"
#include "servo_ctrl.h"
#include "lcd_display.h"
#include "audio.h"

static unsigned long lastPersonTrigger = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=== Smart Umbrella Box ===");

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    initServo();
    initLCD();
    initAudio();

    lcdWrite(0, 0, "Smart Umbrella");
    lcdWrite(0, 1, "Booting...");

    connectWiFi();
    initMqtt();

    lcdClear();
    lcdWrite(0, 0, "System Ready");
    lcdWrite(0, 1, "Waiting...");
}

void loop() {
    mqttLoop();

    unsigned long now      = millis();
    float         distance = measureDistanceCm();

    if (distance > 0 && distance < PERSON_THRESHOLD_CM &&
        now - lastPersonTrigger > COOLDOWN_MS) {

        Serial.printf("[Sensor] Person at %.1f cm -> door/sensed\n", distance);
        lastPersonTrigger = now;
        publishDoorSensed();
    }

    if (checkAutoClose(now)) {
        closeUmbrella();
        publishBinStatus(false);
    }

    delay(200);
}
