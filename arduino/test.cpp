#include <WiFi.h>              // ESP8266 이면 <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ======= WiFi / MQTT 설정 =======
const char* WIFI_SSID     = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST     = "your.mqtt.backend.com";
const uint16_t MQTT_PORT  = 1883;
const char* MQTT_USER     = "mqtt_user";     // 필요 없으면 ""
const char* MQTT_PASS     = "mqtt_pass";     // 필요 없으면 ""

// 백엔드 스펙에 맞게 ID 지정
const char* USER_ID   = "user01";
const char* SENSOR_ID = "door01";
const char* DEVICE_ID = "device01";

// 토픽 
String topicDoorSensed  = String("door/")    + SENSOR_ID  + "/sensed";
String topicSpeakerCmd  = String("speaker/") + DEVICE_ID  + "/cmd";
String topicBoxCmd      = String("box/")     + DEVICE_ID  + "/cmd";   // optional
// 필요하면 쓰레기통 상태 토픽도
String topicBinStatus   = String("bin/")     + DEVICE_ID  + "/status";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// 초음파
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const long PERSON_THRESHOLD_CM = 80;   // 사람이 접근했다고 느끼는 거리 설정값
const unsigned long PERSON_COOLDOWN_MS = 15000; // 15초 안에는 중복 트리거 방지
unsigned long lastPersonTrigger = 0;

// 서보모터
Servo umbrellaServo;
const int SERVO_PIN = 15;
const int SERVO_OPEN_ANGLE   = 90;
const int SERVO_CLOSE_ANGLE  = 0;
bool umbrellaOpen = false;
unsigned long umbrellaCloseAt = 0;  // 0 이면 닫기 예약 없음

// LCD 
LiquidCrystal_I2C lcd(0x27, 16, 2);

// 오디오(PAM8403) 
const int AUDIO_PIN = 25;   // ESP32 DAC 핀 (25/26 사용 가능)

// 함수 선언
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void publishDoorSensed();
void publishBinStatus(bool isOpen);

float measureDistanceCm();
void handleSpeakerCommand(const JsonDocument& doc);
void handleBoxCommand(const JsonDocument& doc);

void openUmbrella(long closeInMs);
void closeUmbrella();

void showTextOnLCD(const String& text);
void playTTSText(const String& text);   // Azure TTS 연동 부분 stub

// ========================================================

void setup() {
  Serial.begin(115200);

  // 핀 설정
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // 서보
  umbrellaServo.attach(SERVO_PIN);
  umbrellaServo.write(SERVO_CLOSE_ANGLE);

  // LCD 초기화
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Booting...");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi");

  connectWiFi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  connectMQTT();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
}


void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // 초음파로 사람 감지
  float distance = measureDistanceCm();
  unsigned long now = millis();

  if (distance > 0 && distance < PERSON_THRESHOLD_CM &&
      now - lastPersonTrigger > PERSON_COOLDOWN_MS) {

    Serial.printf("Person detected: %.1f cm\n", distance);
    lastPersonTrigger = now;
    publishDoorSensed();

  }

  // 우산 자동 닫기 타이밍
  if (umbrellaOpen && umbrellaCloseAt > 0 && now >= umbrellaCloseAt) {
    closeUmbrella();
    umbrellaCloseAt = 0;

    publishBinStatus(false);
  }
}

// ========================================================
// WiFi / MQTT 연결 관련
// ========================================================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = String("esp32-") + String(DEVICE_ID);

    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");

      // 구독
      mqttClient.subscribe(topicSpeakerCmd.c_str());
      mqttClient.subscribe(topicBoxCmd.c_str());

      Serial.print("Subscribed to: ");
      Serial.println(topicSpeakerCmd);
      Serial.print("Subscribed to: ");
      Serial.println(topicBoxCmd);

    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 5 seconds");
      delay(5000);
    }
  }
}

// MQTT 수신 콜백
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr(topic);
  Serial.print("MQTT message [");
  Serial.print(topicStr);
  Serial.print("] ");

  // payload 를 String 으로 변환
  String payloadStr;
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }
  Serial.println(payloadStr);

  // JSON 파싱
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payloadStr);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  if (topicStr == topicSpeakerCmd) {
    handleSpeakerCommand(doc);
  } else if (topicStr == topicBoxCmd) {
    handleBoxCommand(doc);
  }
}

// ========================================================
// 센서 & MQTT 전송
// ========================================================

// 초음파 거리 측정 (cm)
float measureDistanceCm() {
  // Trig 펄스
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Echo 길이 측정
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // 30ms 타임아웃
  if (duration == 0) return -1; // 타임아웃

  float distanceCm = duration * 0.0343 / 2.0;
  return distanceCm;
}

// door/{sensor_id}/sensed 전송
void publishDoorSensed() {
  StaticJsonDocument<256> doc;
  doc["user_id"]   = USER_ID;
  doc["sensor_id"] = SENSOR_ID;
  doc["ts"]        = (uint32_t)(millis() / 1000);

  char buf[256];
  size_t n = serializeJson(doc, buf);

  bool ok = mqttClient.publish(topicDoorSensed.c_str(), buf, n);
  Serial.print("Publish door sensed: ");
  Serial.println(ok ? "OK" : "FAIL");
}

// bin/{device_id}/status 전송 (선택)
void publishBinStatus(bool isOpen) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["remain"]    = 0;     
  doc["cap"]       = 0;
  doc["is_open"]   = isOpen;

  char buf[256];
  size_t n = serializeJson(doc, buf);

  mqttClient.publish(topicBinStatus.c_str(), buf, n);
}

// ========================================================
// 백엔드 → ESP32 명령 처리
// ========================================================

// speaker/{device_id}/cmd
void handleSpeakerCommand(const JsonDocument& doc) {
  const char* type = doc["type"] | "";
  const char* text = doc["text"] | "";

  if (strcmp(type, "tts") != 0) {
    Serial.println("Unknown speaker cmd type");
    return;
  }

  String msg = String(text);
  Serial.print("TTS text from backend: ");
  Serial.println(msg);

  // LCD 표시 (체크리스트/날씨 문구)
  showTextOnLCD(msg);

  // Azure TTS → 오디오 재생 (여기서는 stub)
  playTTSText(msg);
}

// box/{device_id}/cmd
void handleBoxCommand(const JsonDocument& doc) {
  const char* act = doc["act"] | "";
  long closeIn = doc["close_in"] | 10000;  // 기본 10초

  if (strcmp(act, "open") == 0) {
    openUmbrella(closeIn);
  } else if (strcmp(act, "close") == 0) {
    closeUmbrella();
    umbrellaCloseAt = 0;
    publishBinStatus(false);
  } else {
    Serial.println("Unknown box cmd act");
  }
}

// ========================================================
// 서보 제어 (우산 박스)
// ========================================================

void openUmbrella(long closeInMs) {
  Serial.println("Umbrella OPEN");
  umbrellaServo.write(SERVO_OPEN_ANGLE);
  umbrellaOpen = true;
  if (closeInMs > 0) {
    umbrellaCloseAt = millis() + closeInMs;
  }
  publishBinStatus(true);
}

void closeUmbrella() {
  Serial.println("Umbrella CLOSE");
  umbrellaServo.write(SERVO_CLOSE_ANGLE);
  umbrellaOpen = false;
}

// ========================================================
// LCD & TTS 관련
// ========================================================

void showTextOnLCD(const String& text) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Msg:");

  String line1 = text.substring(0, 16);
  String line2 = "";
  if (text.length() > 16) {
    line2 = text.substring(16, 32);
  }

  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// Azure TTS 결과를 재생하는 부분 
void playTTSText(const String& text) {
  Serial.println("playTTSText() called (stub).");

  // ledcAttachPin(AUDIO_PIN, 0);      // 채널 0
  // ledcWriteTone(0, 1000);           // 1kHz
  // delay(300);
  // ledcWriteTone(0, 0);
  // ledcDetachPin(AUDIO_PIN);
}
