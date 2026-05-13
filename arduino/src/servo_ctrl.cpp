#include <Arduino.h>
#include <ESP32Servo.h>
#include "config.h"

static Servo            umbrellaServo;
static bool             umbrellaOpen    = false;
static unsigned long    umbrellaCloseAt = 0;

void initServo() {
    umbrellaServo.attach(SERVO_PIN);
    umbrellaServo.write(SERVO_CLOSE_ANGLE);
    umbrellaOpen = false;
    Serial.println("[Servo] Initialized (closed)");
}

void openUmbrella(long closeInMs) {
    Serial.println("[Servo] OPEN");
    umbrellaServo.write(SERVO_OPEN_ANGLE);
    umbrellaOpen = true;
    umbrellaCloseAt = (closeInMs > 0) ? millis() + closeInMs : 0;
}

void closeUmbrella() {
    Serial.println("[Servo] CLOSE");
    umbrellaServo.write(SERVO_CLOSE_ANGLE);
    umbrellaOpen    = false;
    umbrellaCloseAt = 0;
}

bool isUmbrellaOpen() {
    return umbrellaOpen;
}

bool checkAutoClose(unsigned long now) {
    return umbrellaOpen && umbrellaCloseAt > 0 && now >= umbrellaCloseAt;
}
