#pragma once

// ── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID       "Smart-CAU"
#define WIFI_PASSWORD   "carpediem804!"

// ── MQTT Broker ───────────────────────────────────────────────────────────────
#define MQTT_HOST   "165.194.221.83"
#define MQTT_PORT   1883
#define MQTT_USER   ""
#define MQTT_PASS   ""

// ── Device / Sensor IDs (백엔드 DB와 일치해야 함) ───────────────────────────
#define USER_ID     1
#define SENSOR_ID   1
#define DEVICE_ID   2

// ── GPIO Pins ─────────────────────────────────────────────────────────────────
#define TRIG_PIN        5
#define ECHO_PIN        18
#define SERVO_PIN       15

#define I2S_BCLK_PIN    13
#define I2S_LRCLK_PIN   19
#define I2S_DOUT_PIN    12

// ── Sensor & Timing ───────────────────────────────────────────────────────────
#define PERSON_THRESHOLD_CM     80L
#define COOLDOWN_MS             15000UL

// ── Servo Angles ─────────────────────────────────────────────────────────────
#define SERVO_OPEN_ANGLE    90
#define SERVO_CLOSE_ANGLE   0

// ── Bin ───────────────────────────────────────────────────────────────────────
#define BIN_CAPACITY    3
#define BIN_REMAIN      3   // 실제 센서 없이 임시 고정값

// ── I2S Audio ────────────────────────────────────────────────────────────────
#define I2S_PORT            I2S_NUM_0
#define AUDIO_SAMPLE_RATE   16000
